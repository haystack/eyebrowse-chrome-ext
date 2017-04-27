"use strict"; 

var run_once = false;
var highlighting_enabled;
var url = window.location.href;

function highlighting(user, baseUrl) {
  if (!run_once) {
    $(document).ready(function() {      
      run_once = true;
      var vote_counts = {}; // Keeps track of client-side vote changes
      highlighting_enabled = user.highlighting; // Pulls user state from extension
      var user_pic_url = baseUrl + '/ext/profilepic';

      // Global tags
      var tags_to_save = {};
      var generated_tags = {}; 

      var text = "";

      // Position of popup boxes
      var annote_position = {
        top: 0,
        left: 0,
        anchor_top: 0,
        anchor_left: 0,
      }

      var all_tags = {};

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
          generated_tags = res.tags;

          $.get(baseUrl + "/tags/common_tags").done(function(res) {
            all_tags = res.common_tags;
          });
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
                  + "' class='valuetag_vote_btn fa fa-caret-up fa-2x " 
                  + vote_class 
                  + "' highlight='"
                  + highlight
                  + "' aria-hidden='true'></i>";
        return btn
      }

      // Helper function to remove temporary highlighting from front end
      var removeTemporaryHighlight = function() {
        if ($('.temp-highlight').is(':visible')) {
          $('.temp-highlight').contents().unwrap();
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

            // Ensure empty string not selected
            if (!selection_text 
              || selection_text.charCodeAt(0) === 10
              || selection_text.charCodeAt(0) === 32
              || selection.isCollapsed) {
              removeAddHighlightButton();
              return;
            } 

            // Ensure not trying to highlight on annotation
            if ($.contains($('.annotation').get(0), e.target)) {
              return;
            }

            // Ensure only trying to highlight in a text block
            if (!$(e.target).is("p") && !$(e.target).is("div")) {
              removeAddHighlightButton();
              return;
            }

            removeTemporaryHighlight();
          } 

          // If already highlighted, don't do anything
          if (e.target.classList.contains('highlight-annote') || 
            e.target.classList.contains('temp-highlight')) {
            return;
          }

          getSentenceAndHighlight();

          var parentTop = $('.temp-highlight').offset().top - $(window).scrollTop() - 48;
          var parentLeft = $('.temp-highlight').offset().left - $(window).scrollLeft() + $('.temp-highlight').width() / 2;

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
          }

          annote_position.left = parentLeft;
          annote_position.top = parentTop;
          annote_position.anchor_top = $(window).scrollTop();
          annote_position.anchor_left = $(window).scrollLeft();
        }
      });

      function getSentenceAndHighlight() {
        var html = "";
        if (typeof window.getSelection != "undefined") {
          var sel = window.getSelection();
          var punctuation = [".", "!", "?", ">", "<"];
          console.log(sel);

          if (sel.anchorOffset < sel.focusOffset) {
            var begin = sel.anchorOffset;
            var end = sel.focusOffset;
            var parentNode = sel.anchorNode;
          } else {
            var begin = sel.focusOffset;
            var end = sel.anchorOffset;
            var parentNode = sel.focusNode
          }

          var frag = parentNode.textContent;
          var parent = parentNode.parentElement;

          var newBegin, newEnd;

          var last_non_whitespace_index = begin;
          for (var i = begin; i >= 0; i--) {
            if ($.inArray(frag[i], punctuation) !== -1) {
              break;
            }

            if (/\S/.test(frag[i])) {
              last_non_whitespace_index = i;
            }
          } 

          for (var i = end; i < frag.length; i++) {
            if ($.inArray(frag[i], punctuation) !== -1) {
              newEnd = i + 1;
              break;
            }
          }

          var sentence = frag.substring(last_non_whitespace_index, newEnd);
          text = sentence;
          var newText = $(parent).html().replace(sentence, "<span class='temp-highlight'>" + sentence + "</span>");
          $(parent).html(newText);
        }
      }

      // Show add highlight box on add highlight button click
      $("body").on("click", "#add-highlight-button", function(e) {
        var parentTop = $('.temp-highlight').offset().top - $(window).scrollTop() + $('.temp-highlight').height() + 10;
        var parentLeft = $('.temp-highlight').offset().left - $(window).scrollLeft() + $('.temp-highlight').width() / 2;

        removeAddHighlightButton();
        showAnnotationBox([parentLeft, parentTop]);
        showAnnotationOnHighlight();
      });

      // ***
      // *** ADD HIGHLIGHT INTERFACE LISTENERS *** //
      // ***

      $("body").on("click", ".highlight-add-custom-tag", function() {
        var less_message = "- Show less tags";
        var more_message = "+ Show more tags"
        if ($(this).hasClass('existing')) {
          less_message = "- Hide additional tags";
          more_message = "+ Add additional tags";
        }
        if ($('.highlight-add-custom-tag-tags').attr("tag-status") === "less") {
          $('.highlight-add-custom-tag-tags').attr("tag-status", "more");
          $('.highlight-add-custom-tag').html(more_message);
        } else {
          $('.highlight-add-custom-tag-tags').attr("tag-status", "less");
          $('.highlight-add-custom-tag').html(less_message);
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
          "highlight": encode_highlight(text),
        }).done(function(res) {
          if (res.success) {
            console.log("Added new highlight!");
            $.each(tags_to_save, function(tag, val){
              if (val) {
                $.post(baseUrl + "/tags/vote/add", {
                  "valuetag": tag,
                  "highlight": encode_highlight(text),
                  "url": url,
                  "csrfmiddlewaretoken": user.csrf,
                }).done(function(res) {
                  console.log("Added vote in highlight creation!");
                  setTimeout(function() {
                    $(".temp-highlight").addClass("highlight-annote").removeClass("temp-highlight").attr("highlight", remove_nbsp(text));
                    // removeTemporaryHighlight();
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
        if (all_tags[obj.attr("name")].description != "") {
          tooltipDelay = setTimeout(function() {
            var tooltip = $("<span>", {"class": "icon-name-tooltip"});
            $(tooltip).html(all_tags[obj.attr("name")].description);
            obj.append(tooltip);
            $(tooltip).css({
              "top": $(e.target).offset().top - $(window).scrollTop() - 33,
              "left": $(e.target).offset().left - $(window).scrollLeft() - $(tooltip).width() / 2 + obj.width() / 2 + 10,
            });
          }, 700);
        }
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
          var highlight = $(obj).attr("highlight");
          $('.annote-text').animate({"height": "auto"});
        
          // Get tag information for this highlight
          $.get(baseUrl + "/tags/tags/highlight", {
            "highlight": encode_highlight(highlight),
            "url": url,
          }).done(function(res) {
            vote_counts = {}
            var vts = res.tags

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
              empty_message.append("No tags to show :(");
              $('.annote-text').append(empty_message);
            }

            // Add value tags to DOM
            for (var item in vts) {
              var tag_attrs = vts[item];
              var annote_text_wrapper = $("<div>", {"class": "annote-text-wrapper", "id": tag_attrs.name});
              var annote_valuetag = $("<div>", {"class": "annote-valuetag", "id": tag_attrs.name});
              var annote_vote = $("<div>", {"class": "annote-vote", "id": tag_attrs.name});
              var annote_voters = $("<div>", {"class": "annote-voters", "id": tag_attrs.name});
              var annote_valuetag_desc = $("<div>", {"class": "annote-valuetag-desc", "id": tag_attrs.name});

              annote_valuetag.html(tag_attrs.name);
              annote_valuetag.css({
                'background-color': tag_attrs.color,
              });

              var vote_count = 0
              var extra_votes = null;

              // Add voter icons
              for (var vote in tag_attrs.votes) {
                vote_count += 1;

                if (vote_count > 2) {
                  extra_votes = '<span class="votes-byuser extra-votes-count" name="' + tag_attrs.name + '" votes=' + (vote_count - 2).toString() + ' id="+' + (vote_count - 2).toString() + ' more"><div class="votes-icon"><span class="plus_symbol"> +' + (vote_count - 2).toString() + '</span></div></span>'
                } else {
                  var pic_url = tag_attrs.votes[vote].pic;

                  annote_voters.append(
                    '<span class="votes-byuser" name="' + tag_attrs.name + '" id="' + tag_attrs.votes[vote].name + '"><img class="votes-icon" src=' + pic_url + '></span>'
                  );
                }
              }

              if (extra_votes) {
                annote_voters.append(extra_votes);
              }

              // Add vote button
              vote_counts[tag_attrs.name] = tag_attrs.votes.length;
              var vote_button = getVoteButton(tag_attrs.name, tag_attrs.user_voted, highlight);

              annote_vote.html(
                "<div class='annote-votebutton' id='" + tag_attrs.name + "'>"
                + vote_button
                + "</div>"
                + "<div class='annote-votecount' id='" + tag_attrs.name + "'>" 
                + vote_counts[tag_attrs.name] 
                + "</div>");

              annote_valuetag_desc.html(formatDescription(tag_attrs.description));
              var annote_left_box = $("<div>", {"class": "annote-left", "id": tag_attrs.name});
              annote_left_box.append(annote_valuetag);
              annote_left_box.append(annote_vote);

              annote_text_wrapper.append(annote_left_box);
              annote_text_wrapper.append(annote_voters);
              annote_text_wrapper.append(annote_valuetag_desc);
              $('.annote-text').append(annote_text_wrapper);
            }  

            var add_tag_existing = $("<div>", {"class": "highlight-add-custom-tag existing"});
            var add_tag_existing_tags = $("<div>", {"class": "highlight-add-custom-tag-tags"});
            var vertical_space = $("<div>", {"class": "vertical-space"});
            add_tag_existing.html("+ Add additional tags");

            console.log(vts);
            for (var t in all_tags) {
              var already_exists = false;
              for (var item in vts) {
                console.log(vts[item]);
                console.log(t);
                if (t === vts[item].name) {
                  already_exists = true;
                }
              }

              if (!already_exists) {
                var add_valuetag_tag = $("<div>", {
                  "class": "add-valuetag-tag deselected",
                  "name": t,
                  "bgColor": all_tags[t.toLowerCase()].color
                });

                add_valuetag_tag.html(t);
                add_tag_existing_tags.append(add_valuetag_tag);
              }
            }

            if (add_tag_existing_tags.children().length > 0) {
              var add_tag_existing_submit = $("<div>", {"class": "highlight-add-valuetag-submit"});
              add_tag_existing_submit.html("Save");
            }

            text = $(e.target).attr("highlight");
            $('.annote-text').append(add_tag_existing);
            add_tag_existing_tags.append(add_tag_existing_submit);
            $('.annote-text').append(add_tag_existing_tags);
            $('.annote-text').append(vertical_space);
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
        annotationDelay = setTimeout(function() {
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
            "highlight": encode_highlight(highlight),
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
              "highlight": encode_highlight(highlight),
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
      for (var h in res.highlights) {
        var hl = decode_highlight(h);
        var entire_highlight_present = true;
        var html = $.parseHTML(hl);

        var all_eligible = $.merge($("p"), $("div"));
        var regex = /&nbsp;/gi; // expression here
        var last = null;

        if ($("body").html().indexOf(hl) === -1) {
          all_eligible.filter(function () {
            if (/&nbsp;/gi.test($(this).html())) {
              if ($(this).html().replace(/&nbsp;/gi,'').indexOf(hl) > -1) {
                if (last === null || $(this).children().length < last.children().length) {
                  last = $(this);
                }
              }
            }
          });
          last.html(last.html().replace(hl, "<div class='highlight-annote' highlight='" + hl + "'>"+hl+"</div>")); 
        } else {
          var base = $('*:contains("' + html[0].textContent + '"):last');
          base.html(base.html().replace(hl, "<div class='highlight-annote' highlight='" + hl + "'>"+hl+"</div>"));
        }

        $(".highlight-annote[highlight='"+hl+"']").css({
          "background-color": muteColor(res.highlights[h][1]),
          "display": "inline",
          "padding": "0px 5px",
        });
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

function encode_highlight(highlight) {
  return encodeURIComponent(highlight.replace(/&nbsp;/gi,''));
}

function decode_highlight(highlight) {
  return decodeURIComponent(highlight).replace(/&nbsp;/gi,'');
}

function remove_nbsp(text) {
  return text.replace(/&nbsp;/gi,'');
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