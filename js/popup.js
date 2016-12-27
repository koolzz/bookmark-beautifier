$().ready(function() {
    'use strict';

    $(window).blur(function() {
        window.close;
    });

    printBookmarks();

    $("#sort, #group, #crop").click(function(e) {
        e.preventDefault();
        toggleAllButtons();
    });

    $("#sort").click(function(e) {
        previewFunction(sort);
    });

    $("#group").click(function(e) {
        previewFunction(group);
    });

    $("#crop").click(function(e) {
        previewFunction(crop);
    });

    $("#search").click(function(e) {
        $("#search").select();
    });

    $("#edit").click(function(e) {
        EDIT_MODE = !EDIT_MODE;
        if (EDIT_MODE) {
          showEditButtons()
            $("#bookmarks, .selectedLink").removeClass('selectedLink');
            $(".panel-heading").css("background-color", "#CF995F");
        } else {
          hideEditButtons()
            $(".panel-heading").css("background-color", "#009688");
        }
    });

    $("#search").keyup(function() {
        if ($("#sort").hasClass("disabled"))
            return;
        $('#resetSearch').click(function(event) {
            if ($(event.target).closest("#search, #tools, #desision").length) return;
            printBookmarks();
            $('#resetSearch').unbind("click");
            $("#search").val('');
            event.stopPropagation();
        });
        if ($(this).val().trim().length === 0) {
            $("#search").val('');
            printBookmarks();
        } else {
            searchBookmark($(this).val().trim());
        }
    });
    $("#bookmarks").on('click', '#bLink', function selectFunction(e) {
        if (EDIT_MODE)
            return;
        var link = $(e.currentTarget);
        if (link.hasClass("selectedLink")) {
            window.open(e.target.href, "_blank");
        } else {
            $("#bookmarks, .selectedLink").removeClass('selectedLink');
            link.addClass("selectedLink")
        }
    });

    $("#bookmarks").on('dblclick', 'a', function(e) {
        if (!EDIT_MODE)
            return;
        if ($('#bookmarks').find('.editSelectedVal').length != 0)
            return;
        var oldVal;

        if ($(this).children().length > 0) {
            oldVal = $(this).clone().children().remove().end().text();
            return; //TODO enable renaming folders
        } else {
            oldVal = $(this).html();
        }
        updateVal($(this), oldVal);
    });
});

var ROOT_TABS;
var EDIT_MODE = false;

function printBookmarks() {
    chrome.bookmarks.getTree(function(root) {
        //console.log(root);
        $('#bookmarks').empty();
        ROOT_TABS = root[0].children.length;
        root.forEach(function(folder) {
            $('#bookmarks').append(printBookmarkFolder(folder)
                .css('padding-right', "2px"));
        });
    });
}

function printBookmarkFolder(bookmarkFolder) {
    var list = $("<ul>");
    bookmarkFolder.children.forEach(function(bookmark) {
        if (typeof bookmark.url != 'undefined') {
            list.append(printNode(bookmark));
        } else {
            if (bookmark.children.length != 0) {
                var folder = printNodeFolder(bookmark);

                var r = $("<button type=\"submit\" class=\"dropIcon\"><i class=\"fa fa-caret-down fa-lg\"></i></button>");
                folder.prepend(r);
                folder.append(printBookmarkFolder(bookmark));
                list.append(folder);

                $(r).click(function(e) {
                    if ($(folder).find('li').is(':visible')) {
                        $(folder).children().hide();
                        $(folder).find('.dropIcon').show();
                    } else {
                        $(folder).children().show();
                    }

                });
                if (bookmark.id > ROOT_TABS) {
                    $(folder).children().hide();
                    $(folder).find('.dropIcon').show();
                }
            } else if (bookmark.id > ROOT_TABS) {
                deleteFolder(bookmark);
            }
        }
    });
    return list;
}

function deleteFolder(bookmarkFolder) {
    chrome.bookmarks.remove(bookmarkFolder.id, function() {
        console.log(bookmarkFolder.title + " removed");
    });
}

function printNode(bookmark) {
    var li = $("<li>")
        .attr('id', 'bLink');
    var link = $("<a />", {
        href: bookmark.url,
        text: bookmark.title
    });
    li.append(link);
    return li;
}

function printNodeFolder(bookmark) {
    var li = $("<li>")
        .attr('id', 'bFolder')
        .text(bookmark.title);
    return li;
}

function getHostname(url) {
    var m = url.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
    return m ? m[0] : null;
}

function getFolderName(hostname) {
    var m = hostname.match(/:\/\/(www\.)?(.*)\./);
    return m ? m[2] : null;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function stripPunctuation(string) {
    var punctuationless = string.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    var finalString = punctuationless.replace(/\s{2,}/g, " ");
    return finalString;
}

function addLinksToFolder(newFolder, list, printAfter) {
    var parentId = newFolder.id;
    var name = newFolder.title;

    var length = list.length;
    $.each(list, function(key, value) {
        var subli = $("<li>")
            .text = value.title;

        chrome.bookmarks.move(String(value.id), {
            'parentId': parentId,
            'index': key
        }, function(done) {
            if (key == length - 1 && printAfter)
                printBookmarks();
        });
    });

}

function sortByName(a, b) {
    var aName = a.title.toLowerCase();
    var bName = b.title.toLowerCase();
    return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
}

function addBookmark(parentId, title, url) {
    chrome.bookmarks.create({
        'parentId': parentId,
        'title': title,
        'url': url
    });
}

function rename(oldTitle, newTitle) {
    chrome.bookmarks.search(oldTitle, function callback(results) {
        chrome.bookmarks.update(String(results[0].id), {
            'title': newTitle
        });
    })
}

function updateVal(currentLi, oldVal) {
    $(currentLi).html('<input class="editSelectedVal" type="text" value="' + oldVal + '" />');
    $(".editSelectedVal").focus();
    $(".editSelectedVal").keyup(function(event) {
        if (event.keyCode == 13) {
            rename(oldVal, $(".editSelectedVal").val().trim());
            $(currentLi).html($(".editSelectedVal").val().trim());
        }
    });
    $(document).on("click", function(e) {
        if ($(e.target).is(".editSelectedVal")) {
            return;
        } else {
            $(".editSelectedVal").parent("a").html(oldVal);
            $(document).unbind("click");
        }
    });
}

function previewFunction(callbackFunction) {
    var keys = {
        children: []
    };
    chrome.bookmarks.getTree(function(root) {
        root[0].children.forEach(function(folder) {
            keys.children.push(folder);
        });

        callbackFunction(keys);
        updateBookmarkListBuffer(keys);
    });
}

function updateBookmarks(list, printAfter) {
    list.children.forEach(function(folder, key) {
        if (typeof folder.url === 'undefined') {
            if (folder.create) {
                chrome.bookmarks.create({
                    'parentId': folder.parentId,
                    'title': folder.title
                }, function(e) {
                    folder.children.forEach(function(bookmark) {
                        bookmark.parentId = e.id;
                    });
                    if (key === list.children.length - 1)
                        updateBookmarks(folder, true);
                    else
                        updateBookmarks(folder, false);
                });
                return;
            } else {
                updateBookmarks(folder, false);
            }
        }

        if (folder.id <= ROOT_TABS)
            return;

        if (folder.rename) {
            chrome.bookmarks.update(String(folder.id), {
                'title': folder.title
            });
        }

        chrome.bookmarks.move(String(folder.id), {
            'parentId': folder.parentId,
            'index': key
        }, function callback() {
            if (printAfter && key === list.children.length - 1)
                printBookmarks();
        });
    });
}

function sort(list) {
    list.children.sort(sortByName);
    list.children.forEach(function(folder) {
        if (typeof folder.url === 'undefined' && folder.children.length > 0)
            sort(folder);
    });
}

function group(list) {
    var dictionary = [];
    list.children.forEach(function(folder) {
        if (typeof folder.url === 'undefined' && folder.children.length > 0 && folder.id <= ROOT_TABS) {
            group(folder);
            return;
        }
        if (typeof folder.url != 'undefined') {
            var domain = getHostname(folder.url);
            if (domain === null)
                return;

            //creates an array of results, nly have 2 cases empty or 1 element
            var result = $.grep(dictionary, function(e) {
                return e.key == domain;
            });
            //for 0 create new entry, else increment excisting entry
            if (result == 0) {
                dictionary.push({
                    key: String(domain),
                    value: 1,
                    parentId: folder.parentId,
                    folderName: String(capitalizeFirstLetter(getFolderName(domain))),
                    bookmarkList: [folder]
                });
            } else {
                result[0].value++;
                result[0].bookmarkList.push(folder);
            }
        }
    });
    $.each(dictionary, function(key, value) {
        var folderFound = false;
        if (value.value > 1) {
            dictionary[key].bookmarkList.forEach(function(bookmark) {
                var index = list.children.indexOf(bookmark);
                if (index > -1) {
                    list.children.splice(index, 1);
                }
            });
            $.each(list.children, function(index, bookmark) {
                if (typeof bookmark.url === 'undefined' && bookmark.title === value.folderName) {
                    dictionary[key].bookmarkList.forEach(function(e) {
                        e.parentId = bookmark.id;
                        bookmark.children.push(e);
                    });
                    return false;
                } else if (index === list.children.length - 1) {
                    list.children.push({
                        title: value.folderName,
                        parentId: value.parentId,
                        create: true,
                        children: dictionary[key].bookmarkList
                    });
                }
            });
        }
    });
}

function crop(list) {
    list.children.forEach(function(folder) {
        if (typeof folder.url === 'undefined' && folder.children.length > 0)
            crop(folder);

        if (typeof folder.url != 'undefined') {
            var oldTitle = folder.title;
            oldTitle = stripPunctuation(oldTitle);
            while (oldTitle.length > 70) {
                var lastSpace = oldTitle.lastIndexOf(" ");
                var firstSpace = oldTitle.indexOf(" ");
                if (lastSpace != -1 && lastSpace != firstSpace) {
                    oldTitle = oldTitle.substring(0, lastSpace);
                    folder.rename = true;
                    folder.title = oldTitle;
                } else {
                    return;
                }
            }
        }

    });
}

function updateBookmarkListBuffer(keys) {
    $('#bookmarks').empty();
    $('#bookmarks').append(printBookmarkFolder(keys));

    $('#reject').one("click", function(e) {
        e.preventDefault();
        $('#apply').unbind("click");
        printBookmarks();
        toggleAllButtons();
    });
    $('#apply').one("click", function(e) {
        e.preventDefault();
        $('#reject').unbind("click");
        updateBookmarks(keys, true);
        toggleAllButtons();
    });
}

function toggleAllButtons() {
    if ($("#sort").hasClass("disabled")) {
        $('#bookmarks').animate({
            height: 505
        }, 600);
        $(".search").slideDown(600);
        $("#decision").slideUp(500, function() {
            $("#decision").css('display', 'none');
        });
        $('body').animate({
            scrollTop: 1
        }, 700);
    } else {
        $(".search").slideUp(600);
        $('#bookmarks').animate({
            height: 475
        }, 600);
        $("#decision").slideDown(500);
        $('body').animate({
            scrollTop: 300
        }, 700);
    }
    toggleButtons(["#reject", "#apply"]);
    toggleButtons(["#sort", "#group", "#crop"]);
}

function toggleButtons(idList) {
    idList.forEach(function(id) {
        var button = $(id);
        if (button.hasClass("disabled")) {
            button.removeClass("disabled");
            button.addClass("active");
        } else {
            button.removeClass("active");
            button.addClass("disabled");
        }
    });
}

function searchBookmark(text) {
    var keys = {
        children: []
    };
    chrome.bookmarks.search(text, function(results) {
        $('#bookmarks').empty();
        results.forEach(function(result) {
            if (typeof result.url != 'undefined') {
                keys.children.push(result);
            }
        });
        $('#bookmarks').append(printBookmarkFolder(keys));
    });
}

function showEditButtons(){
  $(".search").slideUp(400);
  $("#add-folder").css('display', 'block');
  $("#trash").css('display', 'block');
}

function hideEditButtons(){
  $(".search").slideDown(400);
  $("#add-folder").css('display', 'none');
  $("#trash").css('display', 'none');
}
