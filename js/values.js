"use strict"; 

var run_once = false;
var highlighting_enabled;
var url = window.location.href;
var generated_tags = {};
var highlight_colors = {};

function highlighting(user, baseUrl) {
  console.log("Highlighting called");
  if (!run_once && user.highlighting && user.loggedIn) {
    console.log("Run-once set");
    run_once = true;

    highlighting_enabled = user.highlighting; // Pulls user state from extension
    var user_pic_url = baseUrl + '/ext/profilepic';

    var annotationDelay;
    var tooltipDelay;

    // Global tags
    var tags_to_save = {
      highlight: {},
      comment: {},
    };

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

    var showSidePanel = function() { $('.side-panel').animate({'right': '0px'}, 200); }
    var hideSidePanel = function() { $('.side-panel').animate({'right': '-450px'}, 200); }

    // Inject scripts and elements into page
    var injectSetup = function() {
      console.log("Injecting setup");
      if (!$(".side-panel").length) {
        $("body").append("<div id='add-highlight-button'><div id='add-symbol'>+</div></div>"
          + "<div class='side-panel'><div class='annote-header'><img src='http://i.imgur.com/DxyYPfZ.png' class='pano-logo'><span class='pano'>PANO</span></div><div class='annote-text'></div></div>");
      } 

      // $("body").append("<div id='side-panel-button'><img src='http://i.imgur.com/DxyYPfZ.png' class='pano-logo'></div>")

      $('head').append("<script type='text/javascript' src='https://use.fontawesome.com/8c63cff961.js'>"
        + "<script src='https://code.jquery.com/ui/1.12.1/jquery-ui.js'></script>");
    
      if (highlighting_enabled) {
        reenable_highlighting();
      }

      // showAllComments();
    }();

    $.get(baseUrl + "/tags/tags/page", {
      url: url,
    }).done(function(res) {
      if (res.success) {
        generated_tags = res.tags;
      }
    });

    $.get(baseUrl + "/tags/common_tags").done(function(res) {
      all_tags = res.common_tags;
    });

    $('body').on('mouseenter', '.side-panel', function() {
      $('body').css('overflow', 'hidden');
    });

    $('body').on('mouseleave', '.side-panel', function() {
      $('body').css('overflow', 'auto');
    });

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

    // Helper function to remove tooltip
    var removeTooltip = function() {
      clearTimeout(tooltipDelay);
      if ($(".icon-name-tooltip").length !== 0) {
        $(".icon-name-tooltip").remove();
      }
    }

    var addTooltip = function(e, obj, label, x_offset=0, y_offset=0, delay=300) {
      tooltipDelay = setTimeout(function() {
        var tooltip = $("<span>", {"class": "icon-name-tooltip"});
        $(tooltip).html(label);
        obj.append(tooltip);
        $(tooltip).css({
          "top": $(e.target).offset().top - $(window).scrollTop() - $(tooltip).height() - 20 + x_offset,
          "left": $(e.target).offset().left - $(tooltip).width() / 2 + $(e.target).width() / 2 - $(window).scrollLeft() + y_offset,
        });
      }, delay);
    }

    var resetTagsToSave = function() {
      tags_to_save = {
        highlight: {},
        comment: {},
      }
    }

    // Helper function to remove temporary highlighting from front end
    // TODO: figure out why this sometimes messes up
    var removeTemporaryHighlight = function() {
      if ($('.temp-highlight').length !== 0) {
        var parent = $('.temp-highlight').parent();
        $('.temp-highlight').contents().unwrap()
        parent.get(0).normalize();
        removeAddHighlightButton();
        clearTimeout(annotationDelay);
      }
    }

    // Helper function to remove add highlight button from front end
    var removeAddHighlightButton = function() {
      if ($("#add-highlight-button").length !== 0) {
        $("#add-highlight-button").hide();
        removeTooltip();
      }
    }

    // Show add tags interface
    var showAnnotationOnHighlight = function() {
      $('.annote-text').html("");
      // $('.annote-header').html("What framing(s) does this statement support?");

      var highlight_add_valuetag = $("<div>", {"class": "highlight-add-valuetag"});
      var highlight_add_valuetag_header = $("<div>", {"class": "highlight-add-valuetag-header bold"});
      var add_valuetag_tags = $("<div>", {"class": "highlight-add-valuetag-tags"});
      var add_valuetag_submit = $("<div>", {"class": "highlight-add-valuetag-submit"});
      add_valuetag_submit.addClass("custom-btn");
      var highlight_error = $("<div>", {"class": "highlight-error"});
      var add_custom_tag = $("<div>", {"class": "highlight-add-custom-tag light"});
      var add_custom_tag_tags = $("<div>", {"class": "highlight-add-custom-tag-tags"});
      var add_valuetag_tag;

      for (var t in generated_tags) {
        add_valuetag_tag = $("<div>", {
          "class": "add-valuetag-tag deselected highlight-tag",
          "name": t,
          "bgColor": all_tags[t.toLowerCase()].color
        });

        add_valuetag_tag.html(t);
        add_valuetag_tags.append(add_valuetag_tag);
      }

      for (var t in all_tags) {
        if (!(t in generated_tags)) {
          add_valuetag_tag = $("<div>", {
            "class": "add-valuetag-tag deselected highlight-tag",
            "name": t,
            "bgColor": all_tags[t.toLowerCase()].color
          });

          add_valuetag_tag.html(t);
          add_custom_tag_tags.append(add_valuetag_tag);
        }
      }

      highlight_add_valuetag_header.html("What frames are used in this sentence?");
      var highlight_add_valuetag_suggested = $("<div>", {"class": "highlight-add-valuetag-suggested light"});
      highlight_add_valuetag_suggested.html("Suggested tags");
      highlight_add_valuetag.prepend(highlight_add_valuetag_header);
      highlight_add_valuetag.append(highlight_add_valuetag_suggested);

      add_custom_tag.html("Additional tags <i class='fa fa-caret-up' aria-hidden='true'></i>");
      add_custom_tag_tags.attr("tag-status", "less");
      add_custom_tag_tags.css("display", "block");

      if (Object.keys(generated_tags).length === 0) {
        add_valuetag_tags.html("No suggested tags to show.");
        add_valuetag_tags.css({
          "color": "#999",
          "font-size": "11px",
          "text-align": "center",
        });
        // add_custom_tag_tags.attr("tag-status", "less");
      }
      
      add_valuetag_submit.html("Save");
      highlight_add_valuetag.append(add_valuetag_tags);
      highlight_add_valuetag.append(add_custom_tag);
      highlight_add_valuetag.append(add_custom_tag_tags);

      var highlight_add_comment = $("<div>", {"class": "highlight-add-comment"});
      var highlight_add_comment_header = $("<div>", {"class": "highlight-add-comment-header bold"});
      var highlight_add_comment_box = $("<div>", {"class": "highlight-add-comment-box", "contenteditable": true, "placeholder": "Write a comment..."});
      var highlight_add_comment_tags = $("<div>", {"class": "highlight-add-comment-tags"});
      var highlight_add_comment_tags_header = $("<div>", {"class": "highlight-add-comment-tags-header light"});
      highlight_add_comment_tags_header.html("Tag your comment");
      highlight_add_comment_tags.append(highlight_add_comment_tags_header);

      for (var t in all_tags) {
        add_valuetag_tag = $("<div>", {
          "class": "add-valuetag-tag deselected comment-tag",
          "name": t,
          "bgColor": all_tags[t.toLowerCase()].color
        });

        add_valuetag_tag.html(t);
        highlight_add_comment_tags.append(add_valuetag_tag);
      }

      highlight_add_comment_header.html("Add your own thoughts");

      highlight_add_comment.append(highlight_add_comment_header);
      highlight_add_comment.append(highlight_add_comment_box);

      highlight_add_comment.append(highlight_add_comment_tags);
      
      $('.annote-text').html(highlight_add_valuetag);
      $('.annote-text').append(highlight_add_comment);
      $('.annote-text').append(highlight_error);
      $('.annote-text').append(add_valuetag_submit);
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

      removeTooltip();
    });

    // Close annotation box if click outside of:
    //  - annotation box
    //  - temporary highlight
    //  - permanent highlight
    $("body").on("click", function(e) {
      removeTooltip();

      if ($(e.target).attr("id") != ("add-highlight-button") 
        && $(e.target).attr("id") != ("add-symbol")) {
        if ($('.side-panel').is(":visible")) {
          if (!$.contains($('.side-panel').get(0), e.target) 
            && !$(e.target).hasClass('temp-highlight') 
            && !$(e.target).hasClass('highlight-annote')) {
            if (!$(e.target).hasClass('delete-highlight')) {
              if (!$(e.target).hasClass('delete-box')) {
                hideSidePanel();
                removeAddHighlightButton();
                resetTagsToSave();
              }
            }
          }
        }
      }

      if ($(e.target).attr("id") != "add-highlight-button"
        && $(e.target).attr("id") != "add-symbol"
        && !$.contains($('.side-panel').get(0), e.target)) {
        removeTemporaryHighlight();   
      }

      // if click outside of:
      // comment-delete btn
      // delete-confirm box,
      // then remove
      if (!$(e.target).hasClass('delete-confirm')
        && $('.delete-confirm').is(":visible") 
        && !$.contains($('.delete-confirm').get(0), e.target) 
        && !$(e.target).hasClass('comment-delete')) {
        $('.delete-confirm').remove();
      }
    });

    // ***
    // *** ADD HIGHLIGHT BUTTON INTERFACE LISTENERS *** //
    // ***

    // Display add highlight functionality on sentence highlight
    var selectionDelay;
    $('body').on('click', function(e){
      // Get highlighted DOM element
      if (highlighting_enabled) {
        clearTimeout(selectionDelay);

        if (window.getSelection) {
          var selection = window.getSelection();
          var selection_text = selection.toString();
          var should_highlight = true;

          // Ensure empty string not selected
          if (!selection_text 
            || selection.isCollapsed || selection_text.length < 5 || !/\S/.test(selection_text)) {
            should_highlight = false;
          } 

          // Ensure not trying to highlight on annotation
          if ($.contains($('.side-panel').get(0), e.target)) {
            should_highlight = false;
          }

          // Ensure only trying to highlight in a text block
          if (!$(e.target).is("p") && !$(e.target).is("div")) {
            if ($(e.target).is("em, strong, li, ul, ol, b, span")) {
              if (!$(e.target).parent().is("p, div")) {
                should_highlight = false;
              }
            } else {
              should_highlight = false;
            }
          }

          $.each($("textarea").get(), function(i) {
            if ($.contains($("textarea").get(i), e.target)) {
              should_highlight = false;
            }
          });

          $.each($("input").get(), function(i) {
            if ($.contains($("input").get(i), e.target)) {
              should_highlight = false;
            }
          });

          $.each($("div[contenteditable=true]").get(), function(i) {
            if ($.contains($("div[contenteditable=true]").get(i), e.target)) {
              should_highlight = false;
            }
          });

          // Ensure not trying to overlap existing highlight
          var range = selection.getRangeAt(0)
          if (range.cloneContents().querySelector('.highlight-annote')) {
            should_highlight = false;
          }

          // If already highlighted, don't do anything
          if (e.target.classList.contains('highlight-annote') || 
            e.target.classList.contains('temp-highlight')) {
            should_highlight = false;
          }

          if (should_highlight) {
            selectionDelay = setTimeout(function() {
              getSentenceAndHighlight();

              if ($('.temp-highlight').parent()) {
                var parentTop = $('.temp-highlight').offset().top - $(window).scrollTop() - 48;
                var parentLeft = $('.temp-highlight').offset().left - $(window).scrollLeft() + $('.temp-highlight').width() / 2;

                if ($("#add-highlight-button").is(":visible")) {
                  $("#add-highlight-button").animate({
                    'left': parentLeft,
                    'top': parentTop,
                  }, 200).animate({
                    'top': parentTop - 3,
                  }, 30).animate({
                    'top': parentTop,
                  });
                } else {
                  $("#add-highlight-button").css({
                    'left': parentLeft,
                    'top': parentTop,
                  });
                  // $("#add-highlight-button").fadeIn("fast");
                  $("#add-highlight-button").animate({
                    'left': parentLeft,
                    'top': parentTop - 4,
                    'opacity': "show",
                  }, 200).animate({
                    'top': parentTop,
                  }, 70);
                }

                annote_position.left = parentLeft;
                annote_position.top = parentTop;
                annote_position.anchor_top = $(window).scrollTop();
                annote_position.anchor_left = $(window).scrollLeft();
              }
            }, 300);
          } else {
            removeAddHighlightButton();
          }
        } 
      }
    });

    function getSentenceAndHighlight() {
      var html = "";
      if (typeof window.getSelection != "undefined") {
        var range = window.getSelection().getRangeAt(0)
        var temp_hl = document.createElement("span");
        temp_hl.className = 'temp-highlight';
        range.surroundContents(temp_hl);
        text = $('.temp-highlight').html();

        if ($('.temp-highlight').is(':visible')) {
          var range = document.createRange();
          range.selectNode($('.temp-highlight').get(0));
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          $('.temp-highlight').remove();
        }
      }
    }

    // Show add highlight box on add highlight button click
    $("body").on("click", "#add-highlight-button", function(e) {
      var parentTop = $('.temp-highlight').offset().top - $(window).scrollTop() + $('.temp-highlight').height() + 10;
      var parentLeft = $('.temp-highlight').offset().left - $(window).scrollLeft() + $('.temp-highlight').width() / 2;

      removeAddHighlightButton();
      showSidePanel();
      showAnnotationOnHighlight();
    });

    // ***
    // *** ADD HIGHLIGHT INTERFACE LISTENERS *** //
    // ***

    $("body").on("click", ".highlight-add-custom-tag", function() {
      var less_message = "Additional tags <i class='fa fa-caret-up' aria-hidden='true'></i>";
      var more_message = "Additional tags <i class='fa fa-caret-down' aria-hidden='true'></i>"
      if ($(this).hasClass('existing')) {
        less_message = "<i class='fa fa-tags' aria-hidden='true'></i>  Hide additional tags";
        more_message = "<i class='fa fa-tags' aria-hidden='true'></i>  Add additional tags";
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
      var tags_with_comment = {};
      var highlight_tags_exist = false;
      var comment_tags_exist = false;

      for (var tag in tags_to_save['highlight']) {
        if (tags_to_save['highlight'][tag]) {
          highlight_tags_exist = true;
          tags_with_highlight[tag] = {
            'description': all_tags[tag].description,
            'color': all_tags[tag].color,
          };
        }
      }

      for (var tag in tags_to_save['comment']) {
        if (tags_to_save['comment'][tag]) {
          comment_tags_exist = true;
          tags_with_comment[tag] = {
            'description': all_tags[tag].description,
            'color': all_tags[tag].color,
          };
        }
      }

      if (!highlight_tags_exist) {
        $(".highlight-error").html("Error: You must tag the framing of the highlight.");
        $(".highlight-add-valuetag-submit").html('Save');
        return;
      }

      if (!comment_tags_exist && $('.highlight-add-comment-box').text().length > 0) {
        $(".highlight-error").html("Error: You must tag the framing of your comment when submitting comment.");
        $(".highlight-add-valuetag-submit").html('Save');
        return;
      }

      var domain_name = $("meta[property='og:site_name']").attr("content") ? $("meta[property='og:site_name']").attr("content") : "";
      var title = $("meta[property='og:title']").attr("content") ? $("meta[property='og:title']").attr("content") : "";
      var comment = $(".highlight-add-comment-box").text();

      $.post(baseUrl + "/tags/highlight", {
        "url": url,
        "tags": JSON.stringify(tags_with_highlight),
        "highlight_id": $(this).attr("highlight_id"),
        "highlight": encodeURIComponent(text),
        "csrfmiddlewaretoken": user.csrf,
      }).done(function(res) {
        resetTagsToSave();
        var callback = function(d) {
          var highlight_id = res.data.highlight_id;
          setTimeout(function() {
            $(".temp-highlight").addClass("highlight-annote").removeClass("temp-highlight").attr({
              "highlight": highlight_id,
              "is_owner": true,
            }).css({
              "border": "none",
              "background-color": "#ccc",
            });
            $('.annote-text').html("<div class='annotation-helper-text'>"
              + '<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>'
              + "Success - annotation added!</div>")

            setTimeout(function() {
              // hideSidePanel();
              makeAnnotationBox(highlight_id);
            }, 2500);
          }, 700);
        };

        if (comment.length > 0) {
          console.log("Comment being made")
          addComment(url, comment, res.data.highlight_id, tags_with_comment, callback);
        } else {
          callback();
        }
        
      });
    });

    // Change front-end of tags upon selection/deselection in add highlight interface
    $("body").on("click", ".add-valuetag-tag", function(e) {
      var valuetag = $(this).attr("name");
      var type;

      if ($(this).hasClass("highlight-tag")) {
        type = 'highlight';
      } else if ($(this).hasClass("comment-tag")) {
        type = 'comment';
      }

      $(".highlight-error").html("");

      if ($(this).hasClass("deselected")) {
        var bgColor = $(this).attr("bgcolor");
        $(this).removeClass("deselected").addClass("selected");
        $(this).css("background-color", bgColor);
        tags_to_save[type][valuetag] = {
          'color': bgColor,
        };
      } else if ($(this).hasClass("selected")) {
        $(this).removeClass("selected").addClass("deselected");
        $(this).css("background-color", "#f7f7f7");
        tags_to_save[type][valuetag] = false;
      }
    });

    // ***
    // *** HIGHLIGHT ANNOTATION INTERFACE LISTENERS *** //
    // ***

    function showAllComments() {
      if (highlighting_enabled) {
        $('.annote-text').html("");
        showSidePanel();

        $.get(baseUrl + "/tags/page/comments", {
          'url': url,
        }).done(function(res) {
          for (var h in res.comments) {
            var hl = decodeURIComponent(res.highlights[h]);
            var hl_header = $("<div>", {"class": "highlight-header"});
            hl_header.css("background-color", highlight_colors[h]);
            hl_header.html(hl);

            $(".annote-text").append(hl_header);
            
            for (var c = 0; c < res.comments[h].length; c++) {
              var comment = createComment(res.comments[h][c]);
              $(".annote-text").append(comment);
            }
          }
        });
      }
    }

    function makeAnnotationBox(highlight) {
      if (highlighting_enabled) {
        $('.annote-text').html("");
        $('.annotation').attr('highlight', highlight);
        $('.annote-text').animate({"height": "auto"});

        var annote_text_wrapper = $("<div>", {"class": "annote-text-wrapper"});

        $.get(baseUrl + "/tags/highlight/comments", {
          "highlight_id": highlight,
        }).done(function(res) {
          var comment_wrapper = $("<div>", {"class": "comment-wrapper"});
          var comments_wrapper = $("<div>", {"class": "comments-wrapper"});
          var add_comment_wrapper = $("<div>", {"class": "add-comment-wrapper"});
          var add_comment_box = $("<div>", {"class": "add-comment-box", "contenteditable": true, "placeholder": "Write a comment...", "highlight": highlight});
          var add_comment_pic = $("<div>", {"class": "add-comment-pic"});
          add_comment_pic.html("<img src=" + user_pic_url + ">")

          var comment_header = $("<div>", {"class": "comment-header bold"});
          var comment_subheader = $("<div>", {"class": "comment-subheader light"});
          var count = 0;
          $.each(res.comments, function(i) {
            var comment = res.comments[i];
            var comment_box = createComment(comment);
            comments_wrapper.append(comment_box);
            count += 1;
          });

          comment_header.html("Comments");
          var comment_text = " comments to display";
          if (count === 1) {
            comment_text = " comment to display";
          }
          comment_subheader.attr("count", count);
          comment_subheader.html(count + comment_text);

          if (count === 0) {
            comment_subheader.html("No comments to display");
          }
          comment_wrapper.append(comments_wrapper);

          var contributed = res.user_contributed;

          $.get(baseUrl + "/tags/tags/highlight", {
            "highlight_id": highlight,
            "url": url,
          }).done(function(res) {
            var highlight_tags_wrapper = $("<div>", {"class": "highlight-tags-wrapper"});
            var highlight_tags_header = $("<div>", {"class": "highlight-tags-header bold"});
            var highlight_tags = $("<div>", {"class": "highlight-tags"});
            highlight_tags_header.html("Frames used in this highlight");
            var existing_tags = {}

            for (var i = 0; i < res.tags.length; i++) {
              var tag = res.tags[i].name;
              existing_tags[tag] = true;
              var annote_valuetag = $("<div>", {"class": "annote-valuetag", "name": tag});
              annote_valuetag.html(tag);
              annote_valuetag.css({
                'background-color': res.tags[i].color,
              });
              highlight_tags.append(annote_valuetag);
            }

            highlight_tags_wrapper.append(highlight_tags_header);
            if (res.tags.length === 0) {
              var highlight_tags_empty = $("<div>", {"class": "highlight-tags-empty light"});
              highlight_tags_empty.html("No framing tags to display");
              highlight_tags_wrapper.append(highlight_tags_empty);
            }
            highlight_tags_wrapper.append(highlight_tags);

            var highlight_add_valuetag = $("<div>", {"class": "highlight-add-valuetag"});
            var add_valuetag_submit = $("<div>", {"class": "highlight-add-valuetag-submit", "highlight_id": highlight});
            add_valuetag_submit.addClass("custom-btn");
            var highlight_error = $("<div>", {"class": "highlight-error"});
            var add_custom_tag = $("<div>", {"class": "highlight-add-custom-tag light"});
            var add_custom_tag_tags = $("<div>", {"class": "highlight-add-custom-tag-tags"});
            var add_valuetag_tag;

            for (var t in all_tags) {
              if (!(t in existing_tags)) {
                add_valuetag_tag = $("<div>", {
                  "class": "add-valuetag-tag deselected highlight-tag",
                  "name": t,
                  "bgColor": all_tags[t.toLowerCase()].color
                });

                add_valuetag_tag.html(t);
                add_custom_tag_tags.append(add_valuetag_tag);
              }
            }

            add_custom_tag.html("Add additional tags <i class='fa fa-caret-down' aria-hidden='true'></i>");
            add_custom_tag_tags.attr("tag-status", "less");
            add_custom_tag_tags.css("display", "none");

            if (Object.keys(generated_tags).length === 0) {
              add_valuetag_tags.html("No suggested tags to show.");
              add_valuetag_tags.css({
                "color": "#999",
                "font-size": "11px",
                "text-align": "center",
              });
              // add_custom_tag_tags.attr("tag-status", "less");
            }
            
            add_valuetag_submit.html("Save");
            highlight_add_valuetag.append(add_valuetag_tags);
            highlight_add_valuetag.append(add_custom_tag);
            add_custom_tag_tags.append(add_valuetag_submit);
            highlight_add_valuetag.append(add_custom_tag_tags);
            highlight_tags_wrapper.append(highlight_add_valuetag);

            annote_text_wrapper.append(highlight_tags_wrapper);

            annote_text_wrapper.append(comment_header);
            annote_text_wrapper.append(comment_subheader);
            annote_text_wrapper.append(comment_wrapper);

            var add_valuetag_tags = $("<div>", {"class": "highlight-add-valuetag-tags"});
            var add_valuetags_header = $("<div>", {"class": "highlight-add-valuetag-header bold"});
            var add_valuetags_subheader = $("<div>", {"class": "highlight-add-valuetag-subheader light"});
            add_valuetags_header.html("Add your own thoughts"); // This is the addtl comments one
            
            if (contributed) {
              add_valuetags_subheader.html("Tag your comment");

              for (var t in all_tags) {
                var add_valuetag_tag = $("<div>", {
                  "class": "add-valuetag-tag deselected comment-tag",
                  "name": t,
                  "bgColor": all_tags[t.toLowerCase()].color
                });

                add_valuetag_tag.html(t);
                add_valuetag_tags.append(add_valuetag_tag);
              }

              add_comment_wrapper.append(add_valuetags_header);
              add_comment_wrapper.append(add_valuetags_subheader);
              add_comment_wrapper.append(add_valuetag_tags);

              add_comment_wrapper.append(add_comment_pic);
              add_comment_wrapper.append(add_comment_box);

              if (count === 0) {
                // $(comment_hider).html("")
                annote_text_wrapper.append(add_comment_wrapper);
                // annote_text_wrapper.append(add_comment_hider);
              } else {
                comment_wrapper.append(add_comment_wrapper);
                // comment_wrapper.append(add_comment_hider);
              }
            } else {
              add_valuetags_subheader.html("Contribute to the framing of this highlight to participate in the discussion");
              add_comment_wrapper.append(add_valuetags_subheader);
              comment_wrapper.append(add_comment_wrapper);
            }

            $(".annote-text").append(annote_text_wrapper);
          });
        });
      
        // // Get tag information for this highlight
        // $.get(baseUrl + "/tags/tags/highlight", {
        //   "highlight": highlight,
        //   "url": url,
        // }).done(function(res) {
        //   var vote_counts = {}
        //   var vts = res.tags

        //   removeTemporaryHighlight();

        //   if (window.getSelection) {
        //     removeAddHighlightButton();
        //   }

        //   // Clear annotation box from previous content
        //   $('.annote-text').html('');
        //   // $('.annote-header').html(decodeURIComponent(res.highlight));

        //   // If no value tags for this highlight, display helper text
        //   if (vts.length === 0) {
        //     var empty_message = $("<div>", {"class": "empty-valuetags"})
        //     empty_message.append("No tags to show :(");
        //     $('.annote-text').append(empty_message);
        //   }

        //   var tag_area = $("<div>", {"class": "tag_area"});
        //   var add_tag_area = $("<div>", {"class": "add_tag_area"});
        //   tag_area.append("<div class='annote-tag-header'>Tags</div>")

        //   $('.annote-text').append(tag_area);
        //   $('.annote-text').append(add_tag_area);

        //   // Add value tags to DOM
        //   $.each(vts, function(item) {
        //     var tag_attrs = vts[item];
        //     var tag_wrapper = $("<div>", {"class": "tag-wrapper", "id": tag_attrs.name});
        //     var annote_valuetag = $("<div>", {"class": "annote-valuetag", "id": tag_attrs.name});

        //     annote_valuetag.html(tag_attrs.name);
        //     annote_valuetag.css({
        //       'background-color': tag_attrs.color,
        //     });

        //     if (tag_attrs.is_owner) {
        //       annote_valuetag.append("<span class='delete-tag-btn' tag=" + tag_attrs.name + "><i class='fa fa-trash' aria-hidden='true'></i></span>")
        //     }

        //     tag_area.append(annote_valuetag);

        //     // var tag_attrs = vts[item];
        //     // var annote_text_wrapper = $("<div>", {"class": "annote-text-wrapper", "id": tag_attrs.name});
        //     // var annote_valuetag = $("<div>", {"class": "annote-valuetag", "id": tag_attrs.name});
        //     // var annote_vote = $("<div>", {"class": "annote-vote", "id": tag_attrs.name});
        //     // var annote_voters = $("<div>", {"class": "annote-voters", "id": tag_attrs.name});
        //     // var annote_valuetag_desc = $("<div>", {"class": "annote-valuetag-desc", "id": tag_attrs.name});

        //     // annote_valuetag.html(tag_attrs.name);
        //     // annote_valuetag.css({
        //     //   'background-color': tag_attrs.color,
        //     // });

        //     // if (tag_attrs.is_owner) {
        //     //   annote_valuetag.append("<span class='delete-tag-btn' tag=" + tag_attrs.name + "><i class='fa fa-trash' aria-hidden='true'></i></span>")
        //     // }

        //     // var vote_count = 0
        //     // var extra_votes = null;

        //     // // Add voter icons
        //     // $.each(tag_attrs.votes, function(vote) {
        //     //   vote_count += 1;

        //     //   if (vote_count > 2) {
        //     //     extra_votes = '<span class="votes-byuser extra-votes-count" name="' + tag_attrs.name + '" votes=' + (vote_count - 2).toString() + ' id="+' + (vote_count - 2).toString() + ' more"><div class="votes-icon"><span class="plus_symbol"> +' + (vote_count - 2).toString() + '</span></div></span>'
        //     //   } else {
        //     //     var pic_url = tag_attrs.votes[vote].pic;

        //     //     annote_voters.append(
        //     //       '<span class="votes-byuser" name="' + tag_attrs.name + '" id="' + tag_attrs.votes[vote].name + '"><a target="_blank" href="' + baseUrl + "/users/" + tag_attrs.votes[vote].name + '"><img class="votes-icon" src="' + pic_url + '"/></a></span>'
        //     //     );
        //     //   }
        //     // });

        //     // if (extra_votes) {
        //     //   annote_voters.append(extra_votes);
        //     // }

        //     // // Add vote button
        //     // vote_counts[tag_attrs.name] = tag_attrs.votes.length;
        //     // var vote_button = getVoteButton(tag_attrs.name, tag_attrs.user_voted, highlight);

        //     // annote_vote.html(
        //     //   "<div class='annote-votebutton' id='" + tag_attrs.name + "'>"
        //     //   + vote_button
        //     //   + "</div>"
        //     //   + "<div class='annote-votecount' id='" + tag_attrs.name + "'>" 
        //     //   + vote_counts[tag_attrs.name] 
        //     //   + "</div>");

        //     // annote_valuetag_desc.html(formatDescription(tag_attrs.description));
        //     // var annote_left_box = $("<div>", {"class": "annote-left", "id": tag_attrs.name});
        //     // annote_left_box.append(annote_valuetag);
        //     // annote_left_box.append(annote_vote);

            
          // });

        //   var add_tag_existing = $("<div>", {"class": "highlight-add-custom-tag existing"});
        //   var add_tag_existing_tags = $("<div>", {"class": "highlight-add-custom-tag-tags"});
        //   var vertical_space = $("<div>", {"class": "vertical-space"});
        //   add_tag_existing.html("<i class='fa fa-tags' aria-hidden='true'></i> Add additional tags");
        //   add_tag_existing_tags.css("display", "none");

        //   for (var t in all_tags) {
        //     var already_exists = false;
        //     for (var item in vts) {
        //       if (t === vts[item].name) {
        //         already_exists = true;
        //       }
        //     }

        //     if (!already_exists) {
        //       var add_valuetag_tag = $("<div>", {
        //         "class": "add-valuetag-tag deselected",
        //         "name": t,
        //         "bgColor": all_tags[t.toLowerCase()].color
        //       });

        //       add_valuetag_tag.html(t);
        //       add_tag_existing_tags.append(add_valuetag_tag);
        //     }
        //   }

        //   if (add_tag_existing_tags.children().length > 0) {
        //     var add_tag_existing_submit = $("<div>", {"class": "highlight-add-valuetag-submit", "highlight_id": highlight});
        //     add_tag_existing_submit.addClass("custom-btn");
        //     add_tag_existing_submit.html("Save");
        //   }

        //   text = $(e.target).attr("highlight");
        //   $('.annote-text').append(add_tag_existing);

        //   // TODO: add comment section here




        //   if ($(obj).attr('is_owner') === 'true') {
        //     var hl_error = $("<div>", {"class": "highlight-error"});
        //     var delete_highlight = $("<div>", {"class": "delete-highlight"});
        //     delete_highlight.html("<i class='fa fa-trash' aria-hidden='true'></i>  Delete this highlight");            
        //     add_tag_existing_tags.append(hl_error);
        //   }

        //   add_tag_existing_tags.append(add_tag_existing_submit);
        //   $('.annote-text').append(add_tag_existing_tags);
        //   $('.annote-text').append(delete_highlight);
        //   $('.annote-text').append(vertical_space);
        // });

        // // Get position to display annotation box in
        // var top = $(e.target).offset().top - $(window).scrollTop() + $(e.target).height() + 5;
        // var left = $(e.target).offset().left - $(window).scrollLeft() + $(e.target).width() / 2;
        showSidePanel();
      }
    }

    function createComment(comment) {
      var comment_box = $("<div>", {"class": "comment-box", "comment_id": comment.id});
      var comment_right = $("<div>", {"class": "comment-right"});
      var comment_left = $("<div>", {"class": "comment-left"});
      var comment_tags = $("<div>", {"class": "comment-tags"});

      comment_left.html('<img class="comment-user-pic" src="' + comment.prof_pic + '"/>');
      comment_right.html("<span class='comment-user-name'>" + comment.user + "</span>");
      var tags = comment.tags;

      if (typeof comment.tags === "string") {
        tags = JSON.parse(comment.tags);
      }

      for (var tag in tags) {
        var annote_valuetag = $("<div>", {"class": "annote-valuetag", "name": tag});
        annote_valuetag.html(tag);
        annote_valuetag.css({
          'background-color': tags[tag].color,
        });
        comment_tags.append(annote_valuetag);
      }

      comment_right.append(comment_tags);
      comment_right.append(
        "<div class='comment-text'>" + comment.comment + "</div>"
        + "<div class='comment-date'>" + comment.date + "</div></div>"
      );

      comment_box.append(comment_left);
      comment_box.append(comment_right);

      if (comment.user === user.username) {
        comment_box.append("<div class='comment-icons'><i class='fa fa-pencil comment-edit' aria-hidden='true'></i></div>");
      }

      return comment_box;
    }

    function addComment(url, comment, highlight, tags, callback, parent_comment) {
      $.post(baseUrl + "/api/v1/history-data", {
        'url': url,
        'message': comment,
        'highlight': highlight,
        'tags': JSON.stringify(tags),
        'parent_comment': parent_comment,
        'csrfmiddlewaretoken': user.csrf,
      }).done(function(res, status, xhr) {
        var location = xhr.getResponseHeader("Location")
        callback(res);
        // $.get(location, {}).done(function(res) {
        //   $.get(baseUrl + "/tags/tags/comment", {
        //     'eyehistory': res.id,
        //   }).done(function(tags) {
        //     console.log(tags.tags);
        //     console.log(res);

        //     var data = {
        //       'comment': {
        //         'id': res.message[0].id,
        //         'comment': res.message[0].message,
        //         'date': res.message[0].post_time,
        //         'user': res.username,
        //         'prof_pic': res.pic_url,
        //         'tags': tags.tags,
        //       }
        //     }
        //     callback(data);
        //   });
          
        // });
        
      });
    }

    // function addComment(url, tag_name, comment, highlight) {
    //   $.post(baseUrl + "/tags/comment/add", {
    //     'url': url,
    //     'comment': comment,
    //     'tag_name': tag_name,
    //     'highlight': highlight,
    //     "csrfmiddlewaretoken": user.csrf,
    //   }).done(function(res) {
    //     if (res.success) {
    //       var new_comment = createComment(res.comment);
    //       var new_count = parseInt($('.comment-hider[tag_name=' + tag_name + ']').attr("count")) + 1;
    //       $('.comment-hider[tag_name=' + tag_name + ']').attr("count", new_count);
    //       $('.comment-wrapper[tag_name=' + tag_name + ']').show();
    //       var comment = " comments";
    //       if (new_count === 1) {
    //         comment = " comment";
    //       }
    //       $('.comment-hider[tag_name=' + tag_name + ']').html("Hide " + new_count + comment);
    //       $('.comments-wrapper[tag_name=' + tag_name + ']').append(new_comment);
    //       $('.add-comment-box[tag_name=' + tag_name + ']').val('');
    //     }
    //   });
    // }

    $('body').on('mouseenter', '.comment-box', function(e) {
      var comment_id = $(e.target).attr('comment_id');
      if (!$('.update-comment-box[comment_id=' + comment_id + ']').is(':visible')) {
        $(this).find('.comment-edit').show();
        // $(this).find('.comment-delete').show();
      }
    });

    $('body').on('mouseleave', '.comment-box', function(e) {
      $(this).find('.comment-edit').hide();
      // $(this).find('.comment-delete').hide();
    });

    // $('body').on('click', '.comment-delete', function(e) {
    //   var delete_confirm = $("<div>", {"class": "delete-confirm"});
    //   var top = $(this).offset().top - $('.annotation').offset().top;
    //   var left = $(this).offset().left - $('.annotation').offset().left;
    //   delete_confirm.html("Are you sure you want to delete this comment?");
    //   delete_confirm.append("<p><span class='delete-box delete-cancel'>Cancel</span><span class='delete-box delete-comment'>Delete</span></p>")
    //   delete_confirm.css({
    //     "position": "absolute",
    //     "top": top + 25,
    //     "left": left - 80,
    //   });
    //   $(e.target).parent().parent().append(delete_confirm);
    // });

    // $('body').on('click', '.delete-cancel', function(e) {
    //   $('.delete-confirm').remove();
    // });

    // $('body').on('click', '.delete-comment', function(e) {
    //   var comment_id = $(this).parent().parent().parent().attr("comment_id");
    //   $.post(baseUrl + "/tags/comment/remove", {
    //     "comment_id": comment_id,
    //     "csrfmiddlewaretoken": user.csrf,
    //   }).done(function(res) {
    //     if (res.success) {
    //       $('.delete-confirm').remove();
    //       $('.comment-box[comment_id=' + comment_id + ']').html('<i style="padding: 7px 0" class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>')
    //       $('.comment-box[comment_id=' + comment_id + ']').css('text-align', 'center');
    //       setTimeout(function() {
    //         $('.comment-box[comment_id=' + comment_id + ']').remove();
    //       }, 500);
    //     }
    //   });
    // });

    $('body').on('click', '.comment-edit', function(e) {
      $(this).parent().hide();
      var comment_id = $(e.target).attr('comment_id');
      var current_comment = $(e.target).parent().parent().children('.comment-right').children('.comment-text')
      var add_comment_box = $("<textarea>", {"class": "update-comment-box", "maxlength": 500, "comment_id": comment_id});
      add_comment_box.val(current_comment.html());
      current_comment.html(add_comment_box);
    });

    $('body').on('click', '.add-comment-submit', function(e) {
      e.preventDefault();
      var tag_name = $(this).attr('tag_name')
      var comment = $('.add-comment-box[tag_name=' + tag_name + ']').val();
      var highlight = $(this).attr('highlight');
      addComment(url, tag_name, comment, highlight);
    });

    // $('body').on('click', '.highlight-add-valuetag-submit', function(e) {
    //   e.preventDefault();
    // });

    $('body').on('keydown', function(e) {
      // if (e.keyCode === 13 && $('.add-comment-box').is(':focus')) {
      //   var tag_name = $(e.target).attr('tag_name')
      //   var comment = $(e.target).val();
      //   var highlight = $('.add-comment-submit[tag_name=' + tag_name + ']').attr('highlight');
      //   addComment(url, tag_name, comment, highlight);
      // }

      if (e.keyCode === 13 && $('.update-comment-box').is(':focus')) {
        var comment_id = $(e.target).parent().parent().parent().attr('comment_id');
        var new_comment = $(e.target).val();
        var text_box = $(e.target).parent();

        $.post(baseUrl + '/tags/comment/edit', {
          'comment_id': comment_id,
          'new_comment': new_comment,
          "csrfmiddlewaretoken": user.csrf,
        }).done(function(res) {
          text_box.parent().parent().children('.comment-icons').show();
          text_box.html(new_comment);
        });
      }

      if (e.keyCode === 13 && $(document.activeElement).hasClass('add-comment-box')) {
        var comment = $(e.target).text();

        if (comment.length === 0) {
          return;
        }

        var parent_comment = $(e.target).attr("comment_id");
        var highlight = $(e.target).attr('highlight');

        var callback = function(res) {
          makeAnnotationBox($(e.target).attr("highlight"))
          // $('.add-comment-box').blur();
          // $('.add-comment-box').html('');
          // console.log(res);
          // var comment = createComment(res.comment);
          // $('.comments-wrapper').append(comment);
          resetTagsToSave();
          $('.add-valuetag-tag').removeClass("selected").addClass("deselected").css("background-color", "#f7f7f7");
        }
        addComment(url, comment, highlight, tags_to_save.comment, callback, parent_comment);
      }
    });

    $('body').on('click', '.delete-tag-btn', function(e) {
      var tag_name = $(this).attr('tag');
      $.post(baseUrl + "/delete_tag", {
        "url": url,
        "tag": tag_name,
        "csrfmiddlewaretoken": user.csrf,
      }).done(function(res) {
        if (res.res === 'success') {
          var removal = $(e.target).parent().parent().parent().parent();
          removal.animate({
            'height': 0,
          }, 300, "linear", function(){
            removal.remove();
          });
        }
      });
    });

    $('body').on('mouseenter', '.annote-valuetag', function(e) {
      var tag = $(this).attr('id');
      $('.delete-tag-btn[tag=' + tag + ']').show();
    });

    $('body').on('mouseleave', '.annote-valuetag', function(e) {
      var tag = $(this).attr('id');
      $('.delete-tag-btn[tag=' + tag + ']').hide();
    });

    $('body').on('click', '.delete-highlight', function(e) {
      $('.annote-text').animate({
        height: '60px',
      });
      $('.annote-header').html("Are you sure you want to delete this highlight?");
      $('.annote-text').html("<div class='delete-highlight-btn custom-btn'>Delete</div>")
    });

    $('body').on('click', '.delete-highlight-btn', function(e) {
      e.preventDefault();
      var highlight_id = $('.annotation').attr('highlight');
      $('.delete-highlight-btn').html('<i class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>');
      $.post(baseUrl + "/tags/highlight/delete", {
        "highlight": highlight_id,
        "csrfmiddlewaretoken": user.csrf,
      }).done(function(res) {
        if (res.success) {
          setTimeout(function() {
            $('.annote-text').animate({
              height: '0px',
            });
            $('.annote-header').html("Highlight deleted!");
            $('.annote-text').html("");

            var parent = $('.highlight-annote').parent();
            $('.highlight-annote[highlight=' + highlight_id + ']').contents().unwrap();
            parent.get(0).normalize();

            setTimeout(function() {
              hideSidePanel();
            }, 2000);
          }, 1000);
        }
      });
    });

    // // Pop up annotation box on hover with delay
    // $('body').on('mouseenter', '.highlight-annote', function(e) {
    //   var obj = $(this);
    //   annotationDelay = setTimeout(function() {
    //     makeAnnotationBox(obj, e);
    //   }, 800);
    // });

    // Pop up annotation box on hover immediately
    $('body').on('click', '.highlight-annote', function(e) {
      makeAnnotationBox($(this).attr("highlight"));
    })

    // Cancel annotation box appearance delay
    $('body').on('mouseleave', '.highlight-annote', function(e) {
      clearTimeout(annotationDelay);
    });


    // Toggle voting
    $('body').on("click", ".valuetag_vote_btn", function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var tagName = $(this).attr("name");
      var highlight = $(this).attr("highlight");

      // Add vote
      if ($(this).hasClass("valuetag_vote")) {

        $.post(baseUrl + "/tags/vote/add", {
          "valuetag": tagName,
          "highlight": encodeURIComponent(highlight),
          "csrfmiddlewaretoken": user.csrf,
          "url": url,
        }).done(function(res) {
          if (res.success) {
            $(this).removeClass("valuetag_vote").addClass("valuetag_rmvote");
            $(".annote-votecount#" + tagName).html(res.vote_count);
            $(".annote-votebutton#" + tagName).html(getVoteButton(tagName, true, highlight));

            if ($(".extra-votes-count[name=" + tagName + "]").is(":visible")) {
              var num_votes = parseInt($(".extra-votes-count").attr("votes"));

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
              + '"><a target="_blank" href="' + baseUrl + "/users/" + user.username + '"><img class="votes-icon" src="' 
              + user_pic_url 
              + '"></a></span>');
          }
        });
      } else if ($(this).hasClass("valuetag_rmvote")) {
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
              $(this).removeClass("valuetag_rmvote").addClass("valuetag_vote");
              $(".annote-votecount#" + tagName).html(res.vote_count);
              $(".annote-votebutton#" + tagName).html(getVoteButton(tagName, false, highlight));
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

    // ****
    // TOOLTIP LISTENERS
    // ****

    // Add remove tooltip listener to elements 
    $("body").on("mouseleave", ".votes-byuser, #add-highlight-button, .annote-votebutton, .delete-tag-btn, .add-valuetag-tag", function() { 
      removeTooltip(); 
    });

    // Display username upon hover on user icon
    $("body").on("mouseenter", ".votes-byuser", function(e) { addTooltip(e, $(this), $(this).attr("id"), 0, -10); });
    $("body").on("mouseenter", ".delete-tag-btn", function(e) { addTooltip(e, $(this), "Delete this tag", 0, -12); });
    $("body").on("mouseenter", ".annote-votebutton", function(e) { addTooltip(e, $(this), "Upvote this tag", 5, -11); });
    $("body").on("mouseenter", "#add-highlight-button", function(e) { addTooltip(e, $(this), "Highlight this text", 0, -11); });
    $("body").on("mouseenter", ".add-valuetag-tag", function(e) {
      var desc = all_tags[$(this).attr("name")].description;
      if (desc !== "") {
        addTooltip(e, $(this), desc, 0, 8, 700);
      }
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
        var hl = decodeURIComponent(h);
        var hl_id = res.highlights[h].id;

        var max_tag = res.highlights[h].max_tag;
        var is_owner = res.highlights[h].is_owner;
        var entire_highlight_present = true;
        var html = $.parseHTML(hl);

        var all_eligible = $.merge($("p"), $("div"));
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
          last.html(last.html().replace(hl, "<div class='highlight-annote' highlight='" + hl_id + "'>"+hl+"</div>")); 
        } else {
          var base = $('p:contains("' + html[0].textContent + '"):last');
          base.html(base.html().replace(hl, "<div class='highlight-annote' highlight='" + hl_id + "'>"+hl+"</div>"));
        }

        $(".highlight-annote[highlight='"+hl_id+"']").css({
          "background-color": muteColor(max_tag[1]),
          "display": "inline",
        });

        highlight_colors[hl_id] = muteColor(max_tag[1]);

        $(".highlight-annote").attr("is_owner", is_owner);
      }
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
    highlighting(request.user, request.baseUrl);

    // if (!highlighting_enabled) {
    //   disable_highlighting();
    // } else {
    //   reenable_highlighting();
    // }
  }

  if (request.type === "initialize_page") {
    $.get(baseUrl + "/tags/tags/page", {
      url: request.page_url,
    }).done(function(res) {
      if (res.success) {
        generated_tags = res.tags;
      }
    });
  }
});