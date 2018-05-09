"use strict"; 

var run_once = false;
var highlighting_enabled;
var url = window.location.href;
var generated_tags = {};
var highlight_colors = {};
var addCommentFlag = 0;


//this is for creating a highlight the other one is viewing an existing highlight
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
          + "<div class='side-panel'><div class='annote-header'><span class='pano'>Margins</span></div><div class='annote-text'></div></div>");
      }

      $("head").append("<script type='text/javascript' src='https://use.fontawesome.com/8c63cff961.js'>"
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
    var getVoteButton = function(item, item_id, user_voted, highlight_id) {
      var vote_class = user_voted ? 'valuetag_rmvote' : 'valuetag_vote';
      var btn = "<i id='" 
                + item 
                + "' highlight_id='"
                + highlight_id
                + "' name='"
                + item
                + "' tag_id='" 
                + item_id
                + "' class='valuetag_vote_btn fa fa-arrow-up " 
                + vote_class 
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

      var highlight_add_valuetag = $("<div>", {"class": "highlight-add-valuetag"});
      var highlight_add_valuetag_header = $("<div>", {"class": "highlight-add-valuetag-header bold"});
      var add_valuetag_tags = $("<div>", {"class": "highlight-add-valuetag-tags"});
      var add_valuetag_submit = $("<button>", {"class": "highlight-add-valuetag-submit"});
      add_valuetag_submit.addClass("custom-btn");
      var highlight_error = $("<div>", {"class": "highlight-error"});
      var add_custom_tag = $("<div>", {"class": "highlight-add-custom-tag light"});
      var add_custom_tag_tags = $("<div>", {"class": "highlight-add-custom-tag-tags"});
      var add_valuetag_tag;
      var highlight_itself_wrapper = $("<div>", {"class": "highlight-itself-wrapper", "style":"margin-top:5px"})
      var highlight_itself = $("<div>", {"class": "highlight-itself temp"});
      
      highlight_itself.html(text);
      highlight_itself_wrapper.append(highlight_itself)

      for (var t in all_tags) {
          
          //added this so notag doesn't show up in lists, no tag meaning when there is a tag called 'notag' that gets assigned
          //when a user doens't select a tag when creating a highlight
          if (t != "notag"){
            add_valuetag_tag = $("<div>", {
            "class": "add-valuetag-tag deselected highlight-tag",
            "name": t,
            "bgColor": all_tags[t.toLowerCase()].color
            });
            add_valuetag_tag.html(t);
            add_custom_tag_tags.append(add_valuetag_tag);
          }
      }

      highlight_add_valuetag_header.html("Would you like to tag your highlight?");
      
      highlight_add_valuetag.append(highlight_itself_wrapper);
      highlight_add_valuetag.append(highlight_add_valuetag_header);

      add_custom_tag.html("Tags");
      add_custom_tag_tags.attr("tag-status", "less");
      add_custom_tag_tags.css("display", "block");

      
      add_valuetag_submit.html("Add Annotation");
      highlight_add_valuetag.append(add_valuetag_tags);
      highlight_add_valuetag.append(add_custom_tag);
      highlight_add_valuetag.append(add_custom_tag_tags);

      var add_valuetags_helper = $("<div>", {"class": "highlight-add-valuetag-helper light"});
      var add_valuetags_desc = $("<div>", {"class": "highlight-add-valuetag-desc"});

      highlight_add_valuetag.append(add_valuetags_helper);
      highlight_add_valuetag.append(add_valuetags_desc);
    
      var highlight_add_comment = $("<div>", {"class": "highlight-add-comment"});
      var highlight_add_comment_header = $("<div>", {"class": "highlight-add-comment-header bold"});
      var highlight_add_comment_box = $("<div>", {"class": "highlight-add-comment-box", "contenteditable": true, "placeholder": "Write text here..."});
      var highlight_add_comment_tags = $("<div>", {"class": "highlight-add-comment-tags"});
      var highlight_add_comment_tags_header = $("<div>", {"class": "highlight-add-comment-tags-header light"});
      highlight_add_comment_tags_header.html("Tag your comment");
      highlight_add_comment_tags.append(highlight_add_comment_tags_header);

      //comment tags
      for (var t in all_tags) {
        //removing notag from comment tags too
        if( t != "notag"){
          add_valuetag_tag = $("<div>", {
          "class": "add-valuetag-tag deselected comment-tag",
          "name": t,
          "bgColor": all_tags[t.toLowerCase()].color
        });

        add_valuetag_tag.html(t);
        highlight_add_comment_tags.append(add_valuetag_tag);
        }

      }
    
      highlight_add_comment_header.html("<div>If you'd like to add a comment about your highlight, use the box below.</div>");
      highlight_add_comment.append(highlight_add_comment_header);
      highlight_add_comment.append(highlight_add_comment_box);


      $('.annote-text').html(highlight_itself_wrapper);
      $('.annote-text').append(highlight_add_comment);
      $('.annote-text').append(highlight_error);
      $('.annote-text').append(add_valuetag_submit);
    }

    // ***
    // *** GENERAL LISTENER FUNCTIONS *** //
    // ***

    // Keeps annotation items sticky on page scroll

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

          // Ensure only trying to highlight in a text block - may need to comment this out
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

    // Create new highlight
    $("body").on("click", ".highlight-add-valuetag-submit", function() {
      // Create new highlight
      $(".highlight-add-valuetag-submit").html('<i class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>');

      var tags_with_highlight = {};
      var tags_with_comment = {};
      var highlight_tags_exist = false;
      var comment_tags_exist = false;
      var is_additional_tag = $(this).attr("additional_tag");

      for (var tag in tags_to_save['highlight']) {
        if (tags_to_save['highlight'][tag]) {
          highlight_tags_exist = true;
          tags_with_highlight[tag] = {
            'description': all_tags[tag].description,
            'color': all_tags[tag].color,
          }; 

          //combining comment tags with highlight
          comment_tags_exist = true;
          tags_with_comment[tag] = {
            'description': all_tags[tag].description,
            'color': all_tags[tag].color,
          };


        }
      }
  
      //i added this to have a default tag
      if (!highlight_tags_exist) {
        highlight_tags_exist = true;
        tags_with_highlight["notag"] = {
          'description': all_tags["notag"].description,
          'color':all_tags["notag"].color
        };

      }

      /* making commenting not required 
      if($('.highlight-add-comment-box').text().length == 0){
        $(".highlight-error").html("Error: You must write a comment.");
        $(".highlight-add-valuetag-submit").html('Save');
        return;
      }
      */

      if (!comment_tags_exist && $('.highlight-add-comment-box').text().length > 0) {
        comment_tags_exist = true;
        tags_with_comment["notag"] = {
          'description': all_tags["notag"].description,
          'color':all_tags["notag"].color
        };

      }
      
      var domain_name = $("meta[property='og:site_name']").attr("content") ? $("meta[property='og:site_name']").attr("content") : "";
      var title = $("meta[property='og:title']").attr("content") ? $("meta[property='og:title']").attr("content") : "";
      var comment = $(".highlight-add-comment-box").text();
      var hl_id = $(this).attr("highlight_id");

      $.post(baseUrl + "/tags/initialize_page", {
        "url": url,
        "domain_name": domain_name,
        "title": title,
        "favIconUrl": "",
        "add_usertags": "true",
        "csrfmiddlewaretoken": user.csrf,
      }).done(function(res) {
        $.post(baseUrl + "/tags/highlight", {
          "url": url,
          "tags": JSON.stringify(tags_with_highlight),
          "highlight_id": hl_id,
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

              var hl_color = $(".highlight-itself").attr("color") || "#ccc";

              if (is_additional_tag) {
                $('.annote-text').html("<div class='annotation-helper-text'>"
                  + '<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>'
                  + "Success - additional tag added!</div>")
              } else {
                $('.annote-text').html("<div class='annotation-helper-text'>"
                  + '<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>'
                  + "Success - annotation added!</div>")
              }

              setTimeout(function() {
                // hideSidePanel();
                makeAnnotationBox(highlight_id, hl_color);
              }, 2500);
            }, 700);
            window.location.reload();
          };

          if (comment.length > 0) {
            console.log("Comment being made")
            addComment(url, comment, res.data.highlight_id, tags_with_comment, callback);
          } else {
            callback();
          }
          
        });
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
        console.log(tags_to_save);
      } else if ($(this).hasClass("selected")) {
        $(this).removeClass("selected").addClass("deselected");
        $(this).css("background-color", "#f7f7f7");
        delete tags_to_save[type][valuetag];
        console.log(tags_to_save);
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

    //this is when the highlight is already created
    function makeAnnotationBox(highlight, hl_color="#ccc") {       
      if (highlighting_enabled) {
        $('.annote-header').html("<span class='pano'>Margins</span>");
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
          //var add_comment_pic = $("<div>", {"class": "add-comment-pic"});
          //add_comment_pic.html("<img src=" + user_pic_url + ">")

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
            var highlight_itself = $("<div>", {"class": "highlight-itself", "color": hl_color});
            var highlight_itself_wrapper = $("<div>", {"class": "highlight-itself-wrapper"});
            highlight_itself.html(decodeURIComponent(res.highlight));
            highlight_itself_wrapper.append(highlight_itself);
            highlight_itself.css("background-color", hl_color);

            var highlight_itself_creator = $("$<div>",{"class":"highlight-creator"});
            var highlight_owner_val = res.highlight_owner.toString();
            highlight_owner_val = "Annotation created by: " + highlight_owner_val;
            highlight_itself_creator.html(highlight_owner_val);
            highlight_itself_wrapper.append(highlight_itself_creator);

            highlight_tags_header.html("Tags in this highlight");
            var existing_tags = {}

            for (var i = 0; i < res.tags.length; i++) {
              var tag = res.tags[i].name;
              existing_tags[tag] = true;
              if(tag != "notag"){
                
                var annote_valuetag = $("<div>", {"class": "annote-valuetag highlight-valuetag", "name": tag});
                var vote_btn = getVoteButton(tag, res.tags[i].id, res.tags[i].user_voted, highlight);
                var annote_vote_count = $("<div>", {"class": "annote-votecount", "id": res.tags[i].name});
                var annote_value_tag_creator = $("<div>", {"class":"annote-valuetag-creator"});
                var tag_creator_val = res.tags[i].owner.toString();
                tag_creator_val = "Added by: " + tag_creator_val;
                annote_value_tag_creator.html(tag_creator_val);
                annote_vote_count.html(res.tags[i].vote_count);
                annote_valuetag.append(annote_vote_count);
                annote_valuetag.append(vote_btn);
                annote_valuetag.append(tag);
                annote_valuetag.append(annote_value_tag_creator);
                // annote_valuetag.html(tag);
                annote_valuetag.css({
                  'background-color': res.tags[i].color,
                });
                
                // highlight_tags.append(annote_vote_count);
                // highlight_tags.append(vote_btn);
                highlight_tags.append(annote_valuetag);
              } 
  
            }

            highlight_tags_wrapper.append(highlight_itself_wrapper);
            highlight_tags_wrapper.append(highlight_tags_header);
            if (res.tags.length === 0) {
              var highlight_tags_empty = $("<div>", {"class": "highlight-tags-empty light"});
              highlight_tags_empty.html("No tags to display");
              highlight_tags_wrapper.append(highlight_tags_empty);
            }
            highlight_tags_wrapper.append(highlight_tags);

            var highlight_add_valuetag = $("<div>", {"class": "highlight-add-valuetag"});

            var add_valuetag_submit = $("<button>", {"class": "highlight-add-valuetag-submit", "highlight_id": highlight, "additional_tag": true});
            add_valuetag_submit.addClass("custom-btn-longer");

            var delete_btn = $("<button>",{"class":"delete-highlight custom-btn", "highlight_id":highlight});
            //delete_btn.addClass("custom-btn");
            var highlight_error = $("<div>", {"class": "highlight-error"});
            var add_custom_tag = $("<div>", {"class": "highlight-add-custom-tag light"});
            var add_custom_tag_tags = $("<div>", {"class": "highlight-add-custom-tag-tags"});
            var add_valuetag_tag;

            for (var t in all_tags) {
              if (!(t in existing_tags)) {
                //removing no tag when adding a second tag
                if(t != "notag"){
                  add_valuetag_tag = $("<div>", {
                  "class": "add-valuetag-tag deselected highlight-tag",
                  "name": t,
                  "bgColor": all_tags[t.toLowerCase()].color
                });

                add_valuetag_tag.html(t);
                add_custom_tag_tags.append(add_valuetag_tag);
                }

              }
            }

            add_custom_tag.html("Tags <i class='fa fa-caret-up' aria-hidden='false'></i>");
            add_custom_tag_tags.css("display", "none");


            add_valuetag_submit.html("Add Tag to Highlight");
            delete_btn.html("Delete Annotation");

            //highlight_add_valuetag.append(add_valuetag_tags); 
            highlight_add_valuetag.append(add_custom_tag);
            add_custom_tag_tags.append(add_valuetag_submit);
            highlight_add_valuetag.append(add_custom_tag_tags);
            highlight_tags_wrapper.append(highlight_add_valuetag);

            //removes the tags section
            //annote_text_wrapper.append(highlight_tags_wrapper);


            annote_text_wrapper.append(highlight_itself_wrapper);
            annote_text_wrapper.append(comment_header);
            annote_text_wrapper.append(comment_subheader);
            annote_text_wrapper.append(comment_wrapper);


            var add_valuetag_tags = $("<div>", {"class": "highlight-add-valuetag-tags"});
            var add_valuetags_header = $("<div>", {"class": "highlight-add-valuetag-header bold"});
            var add_valuetags_subheader = $("<div>", {"class": "highlight-add-valuetag-subheader light"});
            var add_valuetags_helper = $("<div>", {"class": "highlight-add-valuetag-helper light"});
            var add_valuetags_desc = $("<div>", {"class": "highlight-add-valuetag-desc"});
            add_valuetags_header.html("Add to the discussion"); // This is the addtl comments one
            
           //var additional_save_comment_btn = $("<div>", {"class": "additional-save-comment-btn custom-btn"});
           //additional_save_comment_btn.html("Add Comment");

            if (contributed) {
              add_valuetags_subheader.html("Tag Your Comment");

              
              for (var t in all_tags) {
                if(t != "notag"){
                  var add_valuetag_tag = $("<div>", {
                  "class": "add-valuetag-tag deselected comment-tag",
                  "name": t,
                  "bgColor": all_tags[t.toLowerCase()].color
                });

                add_valuetag_tag.html(t);
                add_valuetag_tags.append(add_valuetag_tag);
                }

              }

              add_comment_wrapper.append(add_comment_box);
              //add_comment_wrapper.append(additional_save_comment_btn);
              
              
              //ensures only the owner of the highlight can delete it and see the delete button
              var highlightOwner = $('.highlight-annote').attr('is_owner');
              if ( highlightOwner == "true") {
                add_comment_wrapper.append(delete_btn);
              }

             

              if (count === 0) {
                // $(comment_hider).html("")
                annote_text_wrapper.append(add_comment_wrapper);
                // annote_text_wrapper.append(add_comment_hider);
              } else {
                comment_wrapper.append(add_comment_wrapper);
                // comment_wrapper.append(add_comment_hider);
              }
            } else {
              add_valuetags_subheader.html("Contribute to this annotation to participate in the discussion");
              add_comment_wrapper.append(add_valuetags_subheader);
              comment_wrapper.append(add_comment_wrapper);
            }

            $(".annote-text").append(annote_text_wrapper);
          });
        });
      
      
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
        //comment_tags.append(annote_valuetag); //taking out the tag that shows in comments
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
        comment_box.append("<div class='comment-icons'><i class='fa fa-trash-o comment-delete' aria-hidden='true'></i></div>");
        
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
        window.location.reload();
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
        $(this).find('.comment-delete').show();
      }
    });

    $('body').on('mouseleave', '.comment-box', function(e) {
      $(this).find('.comment-edit').hide();
      $(this).find('.comment-delete').hide();
    });

    $('body').on('click', '.comment-delete', function(e) {
       var delete_confirm = $("<div>", {"class": "delete-confirm"});
       var top = $(this).offset().top - $('.annotation').top;
       var left = $(this).offset().left - $('.annotation').left;
       delete_confirm.html("Are you sure you want to delete this comment?");
       delete_confirm.append("<p><span class='delete-box delete-cancel'>Cancel</span><span class='delete-box delete-comment'>Delete</span></p>")
       delete_confirm.css({
         "position": "absolute",
         "top": top + 25,
         "left": left - 80,
       });
       $(e.target).parent().parent().append(delete_confirm);
     });

     $('body').on('click', '.delete-cancel', function(e) {
       $('.delete-confirm').remove();
     });

     $('body').on('click', '.delete-comment', function(e) {
       var comment_id = $(this).parent().parent().parent().attr("comment_id");
       $.post(baseUrl + "/tags/comment/remove", {
         "comment_id": comment_id,
        "csrfmiddlewaretoken": user.csrf,
       }).done(function(res) {
         if (res.success) {
           $('.delete-confirm').remove();
           $('.comment-box[comment_id=' + comment_id + ']').html('<i style="padding: 7px 0" class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>')
           $('.comment-box[comment_id=' + comment_id + ']').css('text-align', 'center');
           setTimeout(function() {
             $('.comment-box[comment_id=' + comment_id + ']').remove();
           }, 500);
         }
       });
     });

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



      //this is edit your comment once posted
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
          window.location.reload();
        });
      }

      //additional comment button for adding to discussion using save button
      $('body').on('click','.additional-save-comment-btn', function(e){
        var target = $(e.target).siblings(".add-comment-box");
        if (addCommentFlag == 1){
          addCommentFlag = 0;
          return;
        }
        var parent_comment = target.attr("comment_id");
        var highlight = target.attr('highlight');

        var callback = function(res) {
          makeAnnotationBox($('.add-comment-box').attr("highlight"), $(".highlight-itself").attr("color"));
          resetTagsToSave();
          $('.add-valuetag-tag').removeClass("selected").addClass("deselected").css("background-color", "#f7f7f7");
        }
        if(addCommentFlag == 0){
          addComment(url, comment, highlight, tags_to_save.comment, callback, parent_comment);    
          addCommentFlag = 1;          
          
        }
        
      });

      //enter comment to discussion by hitting enter - add comment box - enter key code = 13
      if (e.keyCode === 13 && $(document.activeElement).hasClass('add-comment-box')) {
        var comment = $(e.target).text();

        if (comment.length === 0) {
          return;
        }

        var parent_comment = $(e.target).attr("comment_id");
        var highlight = $(e.target).attr('highlight');

        var callback = function(res) {
          makeAnnotationBox($(e.target).attr("highlight"), $(".highlight-itself").attr("color"))
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




    //delete highlight code / delete annotation
    
    $('body').on('click', '.delete-highlight', function(e) {
      var highlight = $(this).highlight_id;

       var delete_confirm = $("<div>", {"class": "delete-highlight-confirm-box"});
       var top = $(this).offset().top - $('.annotation').top;
       var left = $(this).offset().left - $('.annotation').left;
       delete_confirm.html("<div style='margin-bottom:10px'>Are you sure you want to delete this annotation?</div>");
       delete_confirm.append("<p><span class='delete-box delete-highlight-cancel'>Cancel</span><span class='delete-box delete-highlight-btn'>Delete</span></p>")
       delete_confirm.css({
         "position": "absolute",
         "top": top + 25,
         "left": left - 80,
       });
       $(e.target).append(delete_confirm);

      //the animate causes an issue where the html doesn't fully reappear
      /*
      $('.annote-text').animate({
        height: '50px',
      });*/

    });
  


    $('body').on('click', '.delete-highlight-cancel', function(e) {
      hideSidePanel();      
    });

    $('body').on('click', '.delete-highlight-btn', function(e) {
      e.preventDefault();
      var highlight_id = $(this).parent().parent().parent().attr("highlight_id")
      $('.delete-highlight-confirm-box').html('<i class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>');
      $.post(baseUrl + "/tags/highlight/delete", {
        "highlight": highlight_id,
        "csrfmiddlewaretoken": user.csrf,
      }).done(function(res) {
        if (res.success) {
          setTimeout(function() {
            /* this animate also messed up the html
            $('.annote-text').animate({
              height: '0px',
            });*/
            $('.annote-header').html("<span class='pano'>Margins</span>");
            $('.annote-text').html("Annotation deleted!");
            

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
      makeAnnotationBox($(this).attr("highlight"), $(this).attr("color"));
    })

    // Cancel annotation box appearance delay
    $('body').on('mouseleave', '.highlight-annote', function(e) {
      clearTimeout(annotationDelay);
    });


    // Toggle voting
    $('body').on("click", ".valuetag_vote_btn", function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var tag_id = $(this).attr("tag_id");
      var tag_name = $(this).attr("name");
      var highlight_id = $(this).attr("highlight_id");
      var color = $(".highlight-itself").attr("color");
      var btn = $(this)

      // Add vote
      if ($(this).hasClass("valuetag_vote")) {
        $.post(baseUrl + "/tags/vote/add", {
          "tag_id": tag_id,
          "csrfmiddlewaretoken": user.csrf,
        }).done(function(res) {
          if (res.success) {
            btn.removeClass("valuetag_vote").addClass("valuetag_rmvote");
            $(".annote-votecount#" + tag_name).html(res.vote_count);
            $(".annote-votebutton#" + tag_name).html(getVoteButton(tag_name, tag_id, true, highlight_id));

            if ($(".extra-votes-count[name=" + tag_name + "]").is(":visible")) {
              var num_votes = parseInt($(".extra-votes-count").attr("votes"));

              if (!$(".annote-voters#" + tag_name + " .extra-votes-count").hasClass("extra-votes-count")) {
                $(".annote-voters#" + tag_name + " span:nth-child(2)").hide(function() { $(this).remove(); });
                $(".extra-votes-count[name=" + tag_name + "]").html('<div class="votes-icon"><span class="plus_symbol"> +' + (num_votes + 1).toString() + '</span></div>');
                $(".extra-votes-count[name=" + tag_name + "]").attr("votes", (num_votes + 1).toString());
              }
            }

            makeAnnotationBox(highlight_id, color);
          }
        });
      } else if ($(this).hasClass("valuetag_rmvote")) {
        $.ajax({
          url: baseUrl + "/tags/vote/remove",
          type: "POST",
          data: {
            "tag_id": tag_id,
            "csrfmiddlewaretoken": user.csrf,
          }, 
          success: function(res) {
            if (res.success) {
              btn.removeClass("valuetag_rmvote").addClass("valuetag_vote");
              $(".annote-votecount#" + tag_name).html(res.vote_count);
              $(".annote-votebutton#" + tag_name).html(getVoteButton(tag_name, tag_id, false, highlight_id));
              if (!$(".votes-byuser#" + user.username + "[name=" + tag_name + "]").is(":visible")) {
                var extra_votes_count = parseInt($(".extra-votes-count[name=" + tag_name + "]").attr("votes"));

                if (extra_votes_count > 1) {
                  $(".extra-votes-count[name=" + tag_name + "]").attr("votes", (extra_votes_count - 1).toString());
                  $(".extra-votes-count[name=" + tag_name + "]").attr("id", "+" + (extra_votes_count - 1).toString() + " more");
                  $(".extra-votes-count[name=" + tag_name + "]").html('<div class="votes-icon"><span class="plus_symbol"> +' + (extra_votes_count - 1).toString() + '</span></div>');
                } else {
                  $(".extra-votes-count[name=" + tag_name + "]").hide(function() { $(this).remove(); });
                }
              }

              makeAnnotationBox(highlight_id, color);
            }
          }
        });
      }
    });

    // ****
    // TOOLTIP LISTENERS
    // ****



    $("body").on("mouseenter",".highlight-annote",function(e) { 
      var hover_message = parseInt($(this).attr("comment_count")).toString() + " <i class='fa fa-comments' aria-hidden='true'></i>";
      addTooltip(e,$(this) ,hover_message, 0, -30); 
      //parseInt($(this).attr("comment_count")).toString() + " comment(s)"
    });

    $("body").on("mouseleave",".highlight-annote",function(e) { 
      removeTooltip(); 
    });

    // Add remove tooltip listener to elements 
    $("body").on("mouseleave", ".votes-byuser, #add-highlight-button, .valuetag_rmvote, .valuetag_vote, .delete-tag-btn, .comment-edit", function() { 
      removeTooltip(); 
    });

    // Display username upon hover on user icon
    $("body").on("mouseenter", ".votes-byuser", function(e) { addTooltip(e, $(this), $(this).attr("id"), 0, -10); });
    //$("body").on("mouseenter", ".custom-tag-plus", function(e) { addTooltip(e, $(this), $(this).attr("Add a custom tag"), 0, -10); });
    $("body").on("mouseenter", ".delete-tag-btn", function(e) { addTooltip(e, $(this), "Delete this tag", 0, -12); });
    $("body").on("mouseenter", ".valuetag_rmvote", function(e) { addTooltip(e, $(this), "Remove your upvote", 5, -11); });
    $("body").on("mouseenter", ".valuetag_vote", function(e) { addTooltip(e, $(this), "Upvote this tag", 5, -11); });
    $("body").on("mouseenter", "#add-highlight-button", function(e) { addTooltip(e, $(this), "Add Highlight", 0, -11); });
    $("body").on("mouseenter", ".comment-edit", function(e) { addTooltip(e, $(this), "Edit your comment", 0, -30); });
    $("body").on("mouseenter", ".add-valuetag-tag", function(e) {
      var desc = all_tags[$(this).attr("name")].description;
      if (desc !== "") {
        $(".highlight-add-valuetag-desc").html(desc);
        $(".highlight-add-valuetag-desc").css("height", "30px"); 
        $(".highlight-add-valuetag-desc").css("font-size","12px");
        // addTooltip(e, $(this), desc, 0, 8, 700);
      }
    });
  }
}

// ***
// *** MORE HELPER FUNCTIONS *** //
// ***

// load highlights on page load 
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
        var tooltipDelay;

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
        $(".highlight-annote[highlight='"+hl_id+"']").attr("color", muteColor(max_tag[1]));

        highlight_colors[hl_id] = muteColor(max_tag[1]);

        $(".highlight-annote").attr("is_owner", is_owner);
        $(".highlight-annote[highlight='"+hl_id+"']").attr("comment_count",res.highlights[h].comment_count);
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
