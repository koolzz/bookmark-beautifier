var ROOT_TABS;
var EDIT_MODE = false;

$().ready(function() {
    'use strict';

    $("#resetSearch").hide();

    $(window).blur(function() {
        window.close;
    });

    printBookmarks();
    //deleteEmptyFolder();

    $(".sort, .group, .crop").click(function(e) {
        e.preventDefault();
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
    $("#learn").click(function(e) {
        window.open("https://github.com/koolzz/bookmark-beautifier", "_blank");
    });

    $("#search").click(function(e) {
        $("#search").select();
    });

    $('#add-folder').click(function(e) {
        if ($(".search").is(":visible")) {
            $(".search").slideUp(400);
        } else {
            showSearchLine();
        }
    });

    $('#trash').click(function(e) {
        var list = $(".selectedLink");
        var r = confirm("Delete " + list.length + " selected bookmarks?");

        if (r === true) {
            $(list).each(function(key, bookmark) {
                var link = bookmark.children[0];
                deleteFolder(link.text, link.href, (key === list.length - 1) ? true : false);
            });
        }
    });

    $("#search").keyup(function() {
        if (EDIT_MODE) {
            $(this).keypress(function(e) {
                if (e.which == 13) {
                    if ($(this).val().trim().length != 0) {
                        addNewFolder($(this).val().trim());
                        $("#search").val('');
                    }
                }
            });

            $('#resetSearch').click(function(event) {
                if ($(event.target).closest("#search, #tools, #desision").length) return;
                $('#resetSearch').unbind("click");
                $("#search").val('');
                event.stopPropagation();
            });
        } else {
            if ($("#sort").hasClass("disabled"))
                return;
            $('#resetSearch').click(function(event) {
                if ($(event.target).closest("#search, #tools, #desision").length) return;
                printBookmarks();
                showSearchIcon();
                $('#resetSearch').unbind("click");
                $("#search").val('');
                event.stopPropagation();
            });
            if ($(this).val().trim().length === 0) {
                $("#search").val('');
                printBookmarks();
            } else {
                showReserSearch();
                searchBookmark($(this).val().trim());
            }
        }

    });
    var timeout = null,
        clicks = 0,
        delay = 350;
    $("#bookmarks").on('click', '.bLink', function selectFunction(e) {
        if (EDIT_MODE) {
            e.preventDefault();
            if (!window.event.ctrlKey) {
                $(".selectedLink").removeClass("selectedLink");
            }
            clicks++;
            var li = $(e.target).is('a') ? $(e.currentTarget) : $(e.target);
            if (clicks === 1) {
                if (li.hasClass("selectedLink")) {
                    li.removeClass("selectedLink");
                    clicks = 0;
                } else {
                    li.addClass("selectedLink");
                    timeout = setTimeout(function() {
                        clicks = 0;
                    }, delay);
                }
            } else {
                clicks = 0;
                li.removeClass("selectedLink");
                clearTimeout(timeout);
                if (window.event.ctrlKey)
                    return
                if ($('#bookmarks').find('.editSelectedVal').length != 0)
                    return;
                var target = $(e.target).is('a') ? e.currentTarget : e.target;
                var oldVal = $(target).children()[0].text;
                var url = $(target).children()[0].href;
                updateVal($(target), oldVal, url);

            }
        } else {
            var li = $(e.currentTarget);
            if (li.hasClass("selectedLink")) {
                window.open(li[0].children[0].href, "_blank");
            } else {
                $("#bookmarks, .selectedLink").removeClass('selectedLink');
                li.addClass("selectedLink");
            }
        }
    });

    $("#bookmarks").on('dblclick', '.bLink', function(e) {
        e.preventDefault();
    });
});

function sortableList() {
    $("#bookmarks ul").each(function(key, e) {
        var group = key > 0 ? "subfolders" : "mainfolder";
        Sortable.create(e, {
            group: {
                name: group,
                pull: true,
                put: true
            },
            ghostClass: "sortable-ghost",
            animation: 150,
            onUpdate: function(evt) {
                var item = evt.item;
                var href = $(item).children('a').href;
                var title = $(item).children('a').text();
                var index = evt.newIndex < evt.oldIndex ? evt.newIndex : evt.newIndex + 1;
                chrome.bookmarks.search({
                    'title': title
                }, function(result) {
                    var folder = result[0];
                    chrome.bookmarks.move(folder.id, {
                        'parentId': folder.parentId,
                        'index': index
                    }, function() {
                        printBookmarks([sortableList], true);
                    });
                });
            },
            onAdd: function(evt) {
                var item = evt.item;
                var old = evt.from;
                var parentTitle = $(item).parent('ul').siblings('a').text();
                var href = $(item).children('a').href;
                var title = $(item).children('a').text();
                var index = evt.newIndex;
                chrome.bookmarks.search({
                    'title': parentTitle
                }, function(PARENT) {
                    var id = parentTitle === "Bookmarks bar" ? '1' : parentTitle === "Other bookmarks" ? '2' : parentTitle === "Mobile bookmarks" ? '3' : PARENT[0].id;
                    chrome.bookmarks.search({
                        'url': href,
                        'title': title
                    }, function(result) {
                        var folder = result[0];
                        chrome.bookmarks.move(folder.id, {
                            'parentId': id,
                            'index': index
                        }, function() {
                            sortableList,
                            showFolderChildren,
                            printBookmarks([sortableList], true);
                        });
                    });
                });

            }
        });
    });
}

function deleteEmptyFolder(folder) {
    if (folder) {
        folder.children.forEach(function(bookmark) {
            if (typeof bookmark.url === 'undefined') {
                if (bookmark.children.length != 0) {
                    deleteEmptyFolder(bookmark);
                } else if (bookmark.id > ROOT_TABS) {
                    deleteFolder(bookmark);
                }
            }
        });
    } else {
        chrome.bookmarks.getTree(function(root) {
            root.forEach(function(folder) {
                folder.children.forEach(function(bookmark) {
                    if (typeof bookmark.url === 'undefined') {
                        if (bookmark.children.length != 0) {
                            deleteEmptyFolder(bookmark);
                        } else if (bookmark.id > ROOT_TABS) {
                            deleteFolder(bookmark);
                        }
                    }
                });
            });
        });
    }
}

function deleteFolder(bookmarkFolder) {
    chrome.bookmarks.remove(bookmarkFolder.id, function() {
        console.log(bookmarkFolder.title + " removed");
    });
}

function deleteFolder(title, url, callback) {
    chrome.bookmarks.search({
        'title': title,
        'url': url
    }, function(result) {
        chrome.bookmarks.remove(result[0].id, function() {
            if (callback)
                printBookmarks([sortableList], true);
        });
    });
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
    //We want folders to always be before normal links
    if (typeof a.url === 'undefined' && typeof b.url != 'undefined')
        return -1;
    if (typeof a.url != 'undefined' && typeof b.url === 'undefined')
        return 1;
    return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
}

function addBookmark(parentId, title, url) {
    chrome.bookmarks.create({
        'parentId': parentId,
        'title': title,
        'url': url
    });
}

function rename(oldTitle, url, newTitle) {
    chrome.bookmarks.search({
        'title': oldTitle ? oldTitle : undefined,
        'url': url
    }, function callback(results) {
        chrome.bookmarks.update(String(results[0].id), {
            'title': newTitle
        });
    })
}

function updateVal(currentLi, oldVal, url) {
    $(currentLi).html('<input class="editSelectedVal" type="text" value="' + oldVal + '" />');
    $(".editSelectedVal").focus();
    $(".editSelectedVal").keyup(function(event) {
        if (event.keyCode == 13) {
            rename(oldVal, url, $(".editSelectedVal").val().trim());
            $(currentLi).html('<a href="' + url + '">' + $(".editSelectedVal").val().trim() + '</a>');
        }
    });
    setTimeout(function() {
        $(document).on("click", function(e) {
            if ($(e.target).is(".editSelectedVal")) {
                return;
            } else {
                $(".editSelectedVal").parent("li").html('<a href="' + url + '">' + oldVal + '</a>');
                $(document).unbind("click");
            }
        });
    }, 100);

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

function addNewFolder(name) {
    chrome.bookmarks.create({
        'parentId': '1',
        'title': name
    }, function callback() {
        printBookmarks([sortableList, function() {
            var length = -250 + $($("#bookmarks")[0].children[0].firstChild.lastChild.lastChild).offset().top - $($("#bookmarks")[0].children[0].firstChild.lastChild.firstChild).offset().top;
            $('#bookmarks').animate({
                scrollTop: length
            }, 700);
        }], true);
    });
}

function showSearchLine(){

}

function showReserSearch(){
  $("#resetSearch").show();
  $(".search_icon").hide();
}

function showSearchIcon(){
  $("#resetSearch").hide();
  $(".search_icon").show();
}
