"use strict"; 

var run_once = false;
var highlighting_enabled;
var url = window.location.href;

function highlighting(user, baseUrl) {
  if (!run_once) {
    $(document).ready(function() {
      // $("body").children().each(function () {
      //   // console.log($(this).html().replace(/&nbsp;/gi,' '));
      //   $(this).html($(this).html().replace(/&nbsp;/gi,' '));
      // });
      
      run_once = true;
      var vote_counts = {}; // Keeps track of client-side vote changes
      highlighting_enabled = user.highlighting; // Pulls user state from extension
      var user_pic_url = baseUrl + '/ext/profilepic';

      // Global tags
      var tags_to_save = {};
      var generated_tags = {}; 
      
      // Keep track of temporarily highlighted page objects that need to be reset
      var current_temp_highlight;
      var current_temp_highlight_content;

      var text = "";
      var parent;

      // Position of popup boxes
      var annote_position = {
        top: 0,
        left: 0,
        anchor_top: 0,
        anchor_left: 0,
      }

      var all_tags = {
        "fairness": {
          "description": "Fairness is ideas of justice, rights, and autonomy.", 
          "color": "#bcf0ff",
        },
        "cheating": {
          "description": "Cheating is acting dishonestly or unfairly in order to gain an advantage.",
          "color": "#feffbc",
        },
        "loyalty": {
          "description": "Loyalty underlies virtues of patriotism and self-sacrifice for the group.", 
          "color": "#bcffe2",
        },
        "betrayal": {
          "description": "Betrayal is disloyalty and the destruction of trust.",
          "color": "#ffe5bc",
        },
        "care": {
          "description": "Care is concern for the well-being of others.",
          "color": "#bcc1ff",
        },
        "harm": {
          "description": "Harm is something that causes someone or something to be hurt, broken, made less valuable or successful, etc.",
          "color": "#ffbcf5",
        },
        "authority": {
          "description": "Authority underlies virtues of leadership and followership, including deference to legitimate authority and respect for traditions.",
          "color": "#ffb29e",
        },
        "subversion": {
          "description": "Subversion is the undermining of the power and authority of an established system or institution.",
          "color": "#e7bcff",
        },
        "sanctity": {
          "description": "Sanctity underlies notions of striving to live in an elevated, less carnal, more noble way.",
          "color": "#d6ffbc",
        },
        "degradation": {
          "description": "Degradation is the process in which the beauty or quality of something is destroyed or spoiled",
          "color": "#ffbcd1",
        },
        "morality": {
          "description": "Morality is a particular system of values and principles of conduct.",
          "color": "#c1bfc0",
        },
      };

      // ***
      // *** INITIAL SETUP FUNCTIONS *** //
      // ***


      // Inject scripts and elements into page
      var injectSetup = function() {
        if (!$(".annotation").length) {
          $("body").append("<div class='annotation'><div class='annote-header'></div><div class='annote-text'></div></div><div id='add-highlight-button'><div id='add-symbol'>+</div></div>");
        } 

        $('head').append("<script type='text/javascript' src='https://use.fontawesome.com/8c63cff961.js'><script src='https://code.jquery.com/ui/1.12.1/jquery-ui.js'></script>");
      }();

      // Add article upon visit to page
      var addPage = function() {
        var domain_name = $("meta[property='og:site_name']").attr("content") ? $("meta[property='og:site_name']").attr("content") : "";
        var title = $("meta[property='og:title']").attr("content") ? $("meta[property='og:title']").attr("content") : "";

        // Add page
        $.post(baseUrl + "/tags/initialize_page", {
          "url": url,
          "domain_name": domain_name,
          "title": title,
          "add_usertags": "true",
          "csrfmiddlewaretoken": user.csrf,
        }).done(function(res) {
          generated_tags = res.value_tags;
        });
      }();

      // Fetch highlights on page load
      if (highlighting_enabled) {
        getHighlights(url);
      }

      // ***
      // *** FRONT-END RENDERING HELPER FUNCTIONS *** //
      // ***


      // Helper function to generate vote button for annotation
      var getVoteButton = function(item, user_voted, highlight) {
        var vote_class = user_voted ? 'valuetag_rmvote' : 'valuetag_vote';
        var btn = "<i id='" 
                  + item 
                  + "' name='" 
                  + item 
                  + "' class='valuetag_vote_btn fa fa-thumbs-up fa-lg " 
                  + vote_class 
                  + "' highlight='"
                  + highlight
                  + "' aria-hidden='true'></i>";
        return btn
      }

      // Helper function to remove temporary highlighting from front end
      var removeTemporaryHighlight = function() {
        if (current_temp_highlight) {
          $(current_temp_highlight).html(current_temp_highlight_content);
          current_temp_highlight = null;
          current_temp_highlight_content = null;
        }
      }

      // Helper function to remove add highlight button from front end
      var removeAddHighlightButton = function() {
        if ($("#add-highlight-button").is(":visible")) {
          $("#add-highlight-button").hide();
        }
      }
      
      // Helper function to display annotation box
      var showAnnotationBox = function(position) {
        var halfBoxWidth = $('.annotation').width() / 2;

        $('.annotation').fadeIn("fast").css({
          'left': position[0] - halfBoxWidth,
          'top': position[1] + 5,
        });

        $('.annote-text').css({"height": "auto"});

        annote_position = {
          left: position[0] - halfBoxWidth,
          top: position[1] + 5,
          anchor_top: $(window).scrollTop(),
          anchor_left: $(window).scrollLeft(),
        }
      }

      // Show add tags interface
      var showAnnotationOnHighlight = function() {
        $('.annote-text').html("");
        $('.annote-header').html("What framing(s) does this statement support?");

        var highlight_add_valuetag = $("<div>", {"class": "highlight-add-valuetag"});
        var add_valuetag_tags = $("<div>", {"class": "highlight-add-valuetag-tags"});
        var add_valuetag_submit = $("<div>", {"class": "highlight-add-valuetag-submit"});
        var highlight_error = $("<div>", {"class": "highlight-error"});
        var add_custom_tag = $("<div>", {"class": "highlight-add-custom-tag"});
        var add_custom_tag_tags = $("<div>", {"class": "highlight-add-custom-tag-tags"});
        var add_valuetag_tag;

        for (var t in generated_tags) {
          add_valuetag_tag = $("<div>", {
            "class": "add-valuetag-tag deselected",
            "name": t,
            "bgColor": all_tags[t.toLowerCase()].color
          });

          add_valuetag_tag.html(t);
          add_valuetag_tags.append(add_valuetag_tag);
        }

        for (var t in all_tags) {
          if (!(t in generated_tags)) {
            add_valuetag_tag = $("<div>", {
              "class": "add-valuetag-tag deselected",
              "name": t,
              "bgColor": all_tags[t.toLowerCase()].color
            });

            add_valuetag_tag.html(t);
            add_custom_tag_tags.append(add_valuetag_tag);
          }
        }

        highlight_add_valuetag.prepend("Suggested tags:");
        add_custom_tag.html("+ See more tags");
        
        add_valuetag_submit.html("Save");
        highlight_add_valuetag.append(add_valuetag_tags);
        highlight_add_valuetag.append(add_custom_tag);
        highlight_add_valuetag.append(add_custom_tag_tags);
        highlight_add_valuetag.append(highlight_error);
        highlight_add_valuetag.append(add_valuetag_submit);
        $('.annote-text').html(highlight_add_valuetag);
      }

      // ***
      // *** GENERAL LISTENER FUNCTIONS *** //
      // ***

      // Keeps annotation items sticky on page scroll
      $(window).scroll(function(e) {
        var top = annote_position.top - ($(window).scrollTop() - annote_position.anchor_top);
        var left = annote_position.left - ($(window).scrollLeft() - annote_position.anchor_left);

        if ($('.annotation').is(':visible')) {
          $('.annotation').css({
            'top': top,
            'left': left,
          });
        }

        if ($('#add-highlight-button').is(':visible')) {
          $('#add-highlight-button').css({
            'top': top,
            'left': left,
          });
        }
      });

      // Removes temporary highlighting if click outside of:
      //  - temporary highlight
      //  - add highlight btn
      //  - annotation box
      $('body').on('mouseup', function(e) {
        if (!$(e.target).hasClass('temp-highlight') 
          && $(e.target).attr("id") != "add-highlight-button"
          && $(e.target).attr("id") != "add-symbol"
          && !$.contains($('.annotation').get(0), e.target)) {
          removeTemporaryHighlight();

          if (window.getSelection) {
            var selection = window.getSelection();
            var selection_text = selection.toString();
            if (selection_text.length < 2) {
              removeAddHighlightButton();
            }
          }    
        }
      });

      // Close annotation box if click outside of:
      //  - annotation box
      //  - temporary highlight
      //  - permanent highlight
      $('body').on('click', function(e) {
        if ($(e.target).attr("id") != ("add-highlight-button") 
          && $(e.target).attr("id") != ("add-symbol")) {
          if ($('.annotation').is(":visible")) {
            if (!$.contains($('.annotation').get(0), e.target) 
              && !$(e.target).hasClass('temp-highlight') 
              && !$(e.target).hasClass('highlight-annote')) {
              $('.annotation').fadeOut("fast");
              removeAddHighlightButton();
              tags_to_save = {};
            }
          }
        }
      });

      // ***
      // *** ADD HIGHLIGHT BUTTON INTERFACE LISTENERS *** //
      // ***

      // Display add highlight functionality on sentence highlight
      $('body').on('click', function(e){

        // Get highlighted DOM element
        if (highlighting_enabled) {
          if (window.getSelection) {
            var selection = window.getSelection();
            var selection_text = selection.toString();

            var beginOffset = selection.anchorOffset;
            var endOffset = selection.focusOffset;

            // Ensure empty string not selected
            if (!selection_text 
              || selection_text.charCodeAt(0) === 10
              || selection_text.charCodeAt(0) === 32) {
              removeAddHighlightButton();
              return;
            } 

            var parentNode = selection.anchorNode;
            parent = parentNode.parentElement;
            text = parent.innerHTML;

            // Ensure not trying to highlight on annotation
            if ($.contains($('.annotation').get(0), parent)) {
              return;
            }

            // Ensure only trying to highlight in a text block
            if (!$(parent).is("p") && !$(parent).is("div")) {
              removeAddHighlightButton();
              return;
            }

            removeTemporaryHighlight();
          } 

          // If already highlighted, don't do anything
          if (parent.classList.contains('highlight-annote') || 
            parent.classList.contains('temp-highlight')) {
            return;
          }

          // Add temporary highlighting class to identified object
          $(parent).wrapInner("<div class='temp-highlight'></div>");

          var range = document.createRange();

          if (beginOffset < endOffset) {
            range.setStart(parentNode, beginOffset);
            range.setEnd(parentNode, endOffset);
          } else {
            range.setStart(parentNode, endOffset);
            range.setEnd(parentNode, beginOffset);
          }
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);

          current_temp_highlight = parent;
          current_temp_highlight_content = text;

          var parentTop = $(parent).offset().top - $(window).scrollTop() - 48;
          var parentLeft = $(parent).offset().left - $(window).scrollLeft() + $(parent).width() / 2;

          if ($("#add-highlight-button").is(":visible")) {
            $("#add-highlight-button").animate({
              'left': parentLeft,
              'top': parentTop,
            }, 250);
          } else {
            $("#add-highlight-button").css({
              'left': parentLeft,
              'top': parentTop,
            });
            $("#add-highlight-button").fadeIn("fast");

            annote_position.left = parentLeft;
            annote_position.top = parentTop;
            annote_position.anchor_top = $(window).scrollTop();
            annote_position.anchor_left = $(window).scrollLeft();
          }
        }
      });

      // Show add highlight box on add highlight button click
      $("body").on("click", "#add-highlight-button", function(e) {
        var parentTop = $(parent).offset().top - $(window).scrollTop() + $(parent).height() + 10;
        var parentLeft = $(parent).offset().left - $(window).scrollLeft() + $(parent).width() / 2;

        removeAddHighlightButton();
        showAnnotationBox([parentLeft, parentTop]);
        showAnnotationOnHighlight();
      });

      // ***
      // *** ADD HIGHLIGHT INTERFACE LISTENERS *** //
      // ***

      $("body").on("click", ".highlight-add-custom-tag", function() {
        if ($('.highlight-add-custom-tag-tags').attr("tag-status") === "less") {
          $('.highlight-add-custom-tag-tags').attr("tag-status", "more");
          $('.highlight-add-custom-tag').html("+ Show more tags");
        } else {
          $('.highlight-add-custom-tag-tags').attr("tag-status", "less");
          $('.highlight-add-custom-tag').html("- Show less tags");
        }
        
        $('.highlight-add-custom-tag-tags').animate({
          'height': 'toggle'
        });
      });

      // Create new highlight
      $("body").on("click", ".highlight-add-valuetag-submit", function() {
        // Create new highlight
        $(".highlight-add-valuetag-submit").html('<i class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>');

        var tags_with_highlight = {};
        var tags_exist = false;

        for (var tag in tags_to_save) {
          if (tags_to_save[tag]) {
            tags_exist = true;
            tags_with_highlight[tag] = {
              'description': all_tags[tag].description,
              'color': all_tags[tag].color,
            };
          }
        }

        if (!tags_exist) {
          $(".highlight-error").html("Error: No tags selected.");
          $(".highlight-add-valuetag-submit").html('Save');
          return;
        }

        $.post(baseUrl + "/tags/highlight", {
          "url": url,
          "tags": JSON.stringify(tags_with_highlight),
          "csrfmiddlewaretoken": user.csrf,
          "highlight": encodeURIComponent(text),
        }).done(function(res) {
          if (res.success) {
            console.log("Added new highlight!");
            $.each(tags_to_save, function(tag, val){
              if (val) {
                $.post(baseUrl + "/tags/vote/add", {
                  "valuetag": tag,
                  "highlight": encodeURIComponent(text),
                  "url": url,
                  "csrfmiddlewaretoken": user.csrf,
                }).done(function(res) {
                  console.log("Added vote in highlight creation!");
                  setTimeout(function() {
                    $(".temp-highlight").addClass("highlight-annote").removeClass("temp-highlight").attr("highlight", text);
                    // removeTemporaryHighlight();
                    current_temp_highlight = null;
                    current_temp_highlight_content = null;
                    $('.annote-text').animate({
                      height: '0px',
                    });
                    $('.annote-header').html("Success - tags added!");
                    $('.annote-text').html("")
                    console.log(tags_to_save);

                    setTimeout(function() {
                      $('.annotation').fadeOut('fast');
                    }, 2000);
                  }, 1200);
                });
              }
            });
          } else {
            console.log("Highlight already exists");
            $(parent).html(text);
          }
          tags_to_save = {};
        });
      });

      // Change front-end of tags upon selection/deselection in add highlight interface
      $("body").on("click", ".add-valuetag-tag", function() {
        var valuetag = $(this).attr("name");
        $(".highlight-error").html("");

        if ($(this).hasClass("deselected")) {
          var bgColor = $(this).attr("bgcolor");
          $(this).removeClass("deselected").addClass("selected");
          $(this).css("background-color", bgColor);
          tags_to_save[valuetag] = true;
        } else if ($(this).hasClass("selected")) {
          $(this).removeClass("selected").addClass("deselected");
          $(this).css("background-color", "#f7f7f7");
          tags_to_save[valuetag] = false;
        }
      });

      var tooltipDelay;
      // Display valuetag description above tag
      $("body").on("mouseenter", ".add-valuetag-tag", function(e) {
        var obj = $(this);
        tooltipDelay = setTimeout(function() {
          var tooltip = $("<span>", {"class": "icon-name-tooltip"});
          $(tooltip).html(all_tags[obj.attr("name")].description);
          obj.append(tooltip);
          $(tooltip).css({
            "top": $(e.target).offset().top - $(window).scrollTop() - 33,
            "left": $(e.target).offset().left - $(window).scrollLeft() - $(tooltip).width() / 2 + obj.width() / 2 + 10,
          });
        }, 700);
      });

      // Remove valuetag description tooltip upon leaving hover
      $("body").on("mouseleave", ".add-valuetag-tag", function() {
        clearTimeout(tooltipDelay);
        if ($(".icon-name-tooltip").is(":visible")) {
          $(".icon-name-tooltip").remove();
        }
      });

      // ***
      // *** HIGHLIGHT ANNOTATION INTERFACE LISTENERS *** //
      // ***

      function makeAnnotationBox(obj, e) {
        if (highlighting_enabled) {
          var highlight = obj[0].innerHTML;
          $('.annote-text').animate({"height": "auto"});
        
          // Get tag information for this highlight
          $.get(baseUrl + "/tags/tags/highlight", {
            "highlight": encodeURIComponent(highlight),
            "url": url,
          }).done(function(res) {
            vote_counts = {}
            var vts = res.value_tags

            removeTemporaryHighlight();

            if (window.getSelection) {
              removeAddHighlightButton();
            }

            // Clear annotation box from previous content
            $('.annote-text').html('');
            $('.annote-header').html('This statement supports these framings:');

            // If no value tags for this highlight, display helper text
            if (vts.length === 0) {
              var empty_message = $("<div>", {"class": "empty-valuetags"})
              empty_message.append("No values :(");
              $('.annote-text').append(empty_message);
            }

            // Add value tags to DOM
            for (var item in vts) {
              var tag_attrs = vts[item];
              var annote_text_wrapper = $("<div>", {"class": "annote-text-wrapper", "id": item});
              var annote_valuetag = $("<div>", {"class": "annote-valuetag", "id": item});
              var annote_vote = $("<div>", {"class": "annote-vote", "id": item});
              var annote_voters = $("<div>", {"class": "annote-voters", "id": item});
              var annote_valuetag_desc = $("<div>", {"class": "annote-valuetag-desc", "id": item});

              annote_valuetag.html(item);
              annote_valuetag.css({
                'background-color': tag_attrs.color,
              });

              var vote_count = 0
              var extra_votes = null;

              // Add voter icons
              for (var vote in tag_attrs.votes) {
                vote_count += 1;

                if (vote_count > 2) {
                  extra_votes = '<span class="votes-byuser extra-votes-count" name="' + item + '" votes=' + (vote_count - 2).toString() + ' id="+' + (vote_count - 2).toString() + ' more"><div class="votes-icon"><span class="plus_symbol"> +' + (vote_count - 2).toString() + '</span></div></span>'
                } else {
                  var pic_url = tag_attrs.votes[vote].pic;

                  annote_voters.append(
                    '<span class="votes-byuser" name="' + item + '" id="' + tag_attrs.votes[vote].name + '"><img class="votes-icon" src=' + pic_url + '></span>'
                  );
                }
              }

              if (extra_votes) {
                annote_voters.append(extra_votes);
              }

              // Add vote button
              vote_counts[item] = tag_attrs.votes.length;
              var vote_button = getVoteButton(item, tag_attrs.user_voted, highlight);

              annote_vote.html(
                "<div class='annote-votebutton' id='" + item + "'>"
                + vote_button
                + "</div>"
                + "<div class='annote-votecount' id='" + item + "'>" 
                + vote_counts[item] 
                + "</div>");

              annote_valuetag_desc.html(formatDescription(tag_attrs.description));
              var annote_left_box = $("<div>", {"class": "annote-left", "id": item});
              annote_left_box.append(annote_valuetag);
              annote_left_box.append(annote_vote);

              annote_text_wrapper.append(annote_left_box);
              annote_text_wrapper.append(annote_voters);
              annote_text_wrapper.append(annote_valuetag_desc);
              $('.annote-text').append(annote_text_wrapper);
            }  
          });

          // Get position to display annotation box in
          var top = $(e.target).offset().top - $(window).scrollTop() + $(e.target).height() + 5;
          var left = $(e.target).offset().left - $(window).scrollLeft() + $(e.target).width() / 2;
          showAnnotationBox([left, top]);
        }
      }

      var annotationDelay;
      // Pop up annotation box on hover with delay
      $('body').on('mouseenter', '.highlight-annote', function(e) {
        var obj = $(this);
        var annotationDelay = setTimeout(function() {
          makeAnnotationBox(obj, e);
        }, 700);
      });

      // Pop up annotation box on hover immediately
      $('body').on('click', '.highlight-annote', function(e) {
        makeAnnotationBox($(this), e);
      })

      // Cancel annotation box appearance delay
      $('body').on('mouseleave', '.highlight-annote', function(e) {
        clearTimeout(annotationDelay);
      });

      // Display username upon hover on user icon
      $("body").on("mouseenter", ".votes-byuser", function(e) {
        var tooltip = $("<span>", {"class": "icon-name-tooltip"});
        $(tooltip).html($(this).attr("id"));
        $(tooltip).css({
          "top": $(e.target).offset().top - $(window).scrollTop() - 38,
          "left": $(e.target).offset().left - $(window).scrollLeft() - $(e.target).width() / 2,
        });
        $(this).append(tooltip);
      });

      // Remove username tooltip upon leaving hover
      $("body").on("mouseleave", ".votes-byuser", function() {
        $(".icon-name-tooltip").remove();
      });


      // Toggle voting
      $('body').on("click", ".valuetag_vote_btn", function(e) {
        e.preventDefault();
        var tagName = $(this).attr("name");
        var highlight = $(this).attr("highlight");

        // Add vote
        if ($(this).hasClass("valuetag_vote")) {
          console.log("Adding vote");

          $.post(baseUrl + "/tags/vote/add", {
            "valuetag": tagName,
            "highlight": encodeURIComponent(highlight),
            "csrfmiddlewaretoken": user.csrf,
            "url": url,
          }).done(function(res) {
            if (res.success) {
              console.log("Added vote!");
              vote_counts[tagName] += 1;
              $(this).removeClass("valuetag_vote").addClass("valuetag_rmvote");
              $(".annote-votecount#" + tagName).html(vote_counts[tagName]);
              $(".annote-votebutton#" + tagName).html(getVoteButton(tagName, true, highlight));

              console.log($(".extra-votes-count[name=" + tagName + "]"));

              if ($(".extra-votes-count[name=" + tagName + "]").is(":visible")) {
                var num_votes = parseInt($(".extra-votes-count").attr("votes"));
                console.log(num_votes);

                if (!$(".annote-voters#" + tagName + " .extra-votes-count").hasClass("extra-votes-count")) {
                  $(".annote-voters#" + tagName + " span:nth-child(2)").hide(function() { $(this).remove(); });
                  $(".extra-votes-count[name=" + tagName + "]").html('<div class="votes-icon"><span class="plus_symbol"> +' + (num_votes + 1).toString() + '</span></div>');
                  $(".extra-votes-count[name=" + tagName + "]").attr("votes", (num_votes + 1).toString());
                }
              }

              $(".annote-voters#" + tagName).prepend(
                '<span class="votes-byuser" name="' 
                + tagName 
                + '" id="' 
                + user.username
                + '"><img class="votes-icon" src="' 
                + user_pic_url 
                + '"></span>');
            }
          });
        } else if ($(this).hasClass("valuetag_rmvote")) {
          console.log("Removing vote");

          $.ajax({
            url: baseUrl + "/tags/vote/remove",
            type: "POST",
            data: {
              "valuetag": tagName,
              "highlight": encodeURIComponent(highlight),
              "url": url,
              "csrfmiddlewaretoken": user.csrf,
            }, 
            success: function(res) {
              if (res.success) {
                console.log("Removed vote!");
                vote_counts[tagName] -= 1;
                $(this).removeClass("valuetag_rmvote").addClass("valuetag_vote");
                $(".annote-votecount#" + tagName).html(vote_counts[tagName]);
                $(".annote-votebutton#" + tagName).html(getVoteButton(tagName, false, highlight));
                console.log($(".votes-byuser#" + user.username + "[name=" + tagName + "]"));
                if (!$(".votes-byuser#" + user.username + "[name=" + tagName + "]").is(":visible")) {
                  var extra_votes_count = parseInt($(".extra-votes-count[name=" + tagName + "]").attr("votes"));

                  if (extra_votes_count > 1) {
                    $(".extra-votes-count[name=" + tagName + "]").attr("votes", (extra_votes_count - 1).toString());
                    $(".extra-votes-count[name=" + tagName + "]").attr("id", "+" + (extra_votes_count - 1).toString() + " more");
                    $(".extra-votes-count[name=" + tagName + "]").html('<div class="votes-icon"><span class="plus_symbol"> +' + (extra_votes_count - 1).toString() + '</span></div>');
                  } else {
                    $(".extra-votes-count[name=" + tagName + "]").hide(function() { $(this).remove(); });
                  }
                }
                $(".votes-byuser#" + user.username + "[name=" + tagName + "]").hide(function() { $(this).remove(); });
              }
            }
          });
        }
      });
    });
  }
}

// ***
// *** MORE HELPER FUNCTIONS *** //
// ***

// Fetch highlights on page load
function getHighlights(url) {
  $.get(baseUrl + "/tags/highlights", {
    "url": url,
  }).done(function(res) {
    if (res.success) {
      if (!res.highlights.length) {
        console.log("No highlights to display");
      }

      for (var h in res.highlights) {
        var hl = decodeURIComponent(h);
        var entire_highlight_present = true;
        var html = $.parseHTML(hl);
        var base = $('*:contains("' + html[0].textContent + '"):last');

        for (var i in html.slice(1, html.length)) {
          if (!base.has(html[i])) {
            entire_highlight_present = false;
          }
        }

        if (entire_highlight_present) {
          base.wrapInner("<div class='highlight-annote' highlight='" + hl + "'></div>");
          $(".highlight-annote[highlight='"+hl+"']").css({
            "background-color": muteColor(res.highlights[h][1]),
            "display": "inline",
            "padding": "0px 5px",
          });
        }
      }
    } else {
      console.log(res.errors['get_highlights']);
    }
  });
}

function formatDescription(desc) {
  var formattedString = "<strong>";
  for (var c = 0; c < desc.length; c++) {
    if (desc[c] === ' ') {
      var value = desc.substring(0, c);
      formattedString += value;
      formattedString += "</strong> ";
      break;
    }
  }
  formattedString += desc.substring(c, desc.length);
  return formattedString;
}

// ***
// *** CONTROL IN-PAGE HIGHLIGHTS FROM POPUP HELPERS *** //
// ***

function disable_highlighting() {
  $(".highlight-annote").each(function() {
    var old_bg = $(this).css("backgroundColor");
    $(this).attr({
      "old-background-color": old_bg,
    }).css({
      "background-color": "#fff",
    });
  });
}

function reenable_highlighting() {
  var highlight_exists = false;
  $(".highlight-annote").each(function() {
    highlight_exists = true;
    var old_bg = $(this).attr("old-background-color");
    $(this).css({
      "background-color": old_bg,
    });
  });

  if (!highlight_exists) {
    getHighlights(url);
  }
}

// Trigger highlighting 
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === "highlight") {
    highlighting(request.user, request.baseUrl);
  }

  if (request.type === "toggleHighlight") {
    highlighting_enabled = request.user.highlighting;

    if (!highlighting_enabled) {
      disable_highlighting();
    } else {
      reenable_highlighting();
    }
  }
});