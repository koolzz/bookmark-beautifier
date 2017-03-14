var ROOT_TABS;
var EDIT_MODE = false;

$().ready(function() {
    'use strict';

    showSearchIcon();
    showToolsBar();

    $(window).blur(function() {
        window.close;
    });

    printBookmarks([sortableList]);

    $("#sort").click(function(e) {
        previewFunction(sort);
    });

    var text ={
        "sort":"Sort bookmarks",
        "group":"Group by domain name",
        "crop":"Shorten long link titles",
        "new_folder":"Add a new folder",
    }
    $("#sort, #group, #crop, #new_folder").hover(function(e) { 
        $("#tooltiptext").text(text[e.currentTarget.id]);
        $("#tooltiptext").fadeIn(150);
    },function(e) { 
        $("#tooltiptext").fadeOut(150);
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

    $('#new_folder').click(function(e) {
        showNewFolderBar();
    });

    $("#reject_folder").click(function() {
        $("#create_new_folder").val('');
        showToolsBar();
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
        hideTrashIcon();
    });

    $("#create_new_folder").keyup(function(e) {
        if (e.which == 13) {
            if ($(this).val().trim().length != 0) {
                addNewFolder($(this).val().trim());
                $("#create_new_folder").val('');
            }
            showToolsBar();
        }

        $("#apply_folder").click(function() {
            if ($("#create_new_folder").val().trim().length != 0) {
                addNewFolder($("#create_new_folder").val().trim());
                $("#create_new_folder").val('');
            }
            showToolsBar();
        });

    });

    $("#search").keyup(function() {
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
            showSearchIcon();
            printBookmarks();
        } else {
            showReserSearch();
            searchBookmark($(this).val().trim());
        }
    });
    var timeout = null,
        openLink = null,
        clicks = 0,
        openLinkDelay = 300,
        editLinkdelay = 300;
    $("#bookmarks").on('click', '.bLink', '.selectedLink', function selectFunction(e) {
        e.preventDefault();
        var li = $(e.currentTarget);

        if (li.find(".editSelectedVal").length > 0) {
            return;
        }

        clicks++;
        if (clicks === 1) {
            showTrashIcon();
            if (li.hasClass("selectedLink")) {
                /* Click on already selected target
                 *
                 * If pressing ctrl
                 *   Check for ctrl press, deselect on repeated click when in ctrl mode
                 *
                 * Else
                 *   open link after delay
                 *   delay is used to distingwish between doubleclick for editing title
                 */

                if (window.event.ctrlKey) {
                    li.removeClass("selectedLink");
                    if ($(".selectedLink").length ==0) {
                        hideTrashIcon();
                    }
                    clicks = 0;
                } else {
                    if ($(".selectedLink").length > 1) {
                        $(".selectedLink").removeClass("selectedLink");
                        li.addClass("selectedLink");
                        timeout = setTimeout(function() {
                            clicks = 0;
                        }, editLinkdelay);
                        return;
                    } else {
                        openLink = setTimeout(function() {
                            window.open($(li)[0].children[0].href, "_blank");
                        }, openLinkDelay);
                    }
                }
            } else {
                /* Click on non selected link
                 *
                 * If pressing ctrl
                 *   select link
                 *
                 * Else
                 *   deselect all selected links, select clicked one
                 */
                clearTimeout(openLink);
                if (window.event.ctrlKey) {
                    clicks = 0;
                } else {
                    timeout = setTimeout(function() {
                        clicks = 0;
                    }, editLinkdelay);
                    $(".selectedLink").removeClass("selectedLink");
                }
                li.addClass("selectedLink");
            }
        } else {
            /* Double click detected
             *
             * Clear timeouts to avoid openning links
             *
             * If link is not selected or in ctrl mode don't enter edit mode
             */
            clearTimeout(openLink);
            clearTimeout(timeout);
            if (!li.hasClass("selectedLink")) {
                if (!window.event.ctrlKey) {
                    timeout = setTimeout(function() {
                        clicks = 0;
                    }, editLinkdelay);
                    $(".selectedLink").removeClass("selectedLink");
                }
                li.addClass("selectedLink");
                return;
            } else {
                clicks = 0;
            }
            if (window.event.ctrlKey)
                return;
            if ($('#bookmarks').find('.editSelectedVal').length != 0)
                return;

            li.removeClass("selectedLink");
            var target = li;
            var oldVal = li.children()[0].text;
            var url = li.children()[0].href;
            updateVal(li[0], oldVal, url);

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
                        printBookmarks([sortableList]);
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
    var depth = $(currentLi).parents("ul").length - 1,
        padding = 20,
        hostname = $('<a>').prop('href', url).prop('hostname');

    $(currentLi).html('<input class="editSelectedVal" type="text" value="' + oldVal + '" />');
    $(currentLi).find('.editSelectedVal').css('padding-left', depth * padding + 13);
    $(".editSelectedVal").focus();
    $(".editSelectedVal").keyup(function(event) {
        if (event.keyCode == 13) {
            rename(oldVal, url, $(".editSelectedVal").val().trim());
            var li = $(currentLi);
            var a = $("<a>")
                .attr('href', url)
                .text($(".editSelectedVal").val().trim());
            li.empty();
            li.append(a[0]);
            li.find('a').prepend("<img class=\"linkIcon\" src=" + ("https://www.google.com/s2/favicons?domain=" + hostname) + "/>");
            li.find('a').css('padding-left', depth * padding + 13);

        }
    });
    setTimeout(function() {
        $(document).on("click", function(e) {
            if ($(e.target).is(".editSelectedVal")) {
                return;
            } else {
                var hostname = $('<a>').prop('href', url).prop('hostname');
                var li = $(".editSelectedVal").parent("li");

                var a = $("<a>")
                    .attr('href', url)
                    .text(oldVal);
                li.empty();
                li.append(a[0]);
                li.find('a').prepend("<img class=\"linkIcon\" src=" + ("https://www.google.com/s2/favicons?domain=" + hostname) + "/>");
                li.find('a').css('padding-left', depth * padding + 13);
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

function showReserSearch() {
    $("#resetSearch").show();
    $(".search_icon").hide();
}

function showSearchIcon() {
    $("#resetSearch").hide();
    $(".search_icon").show();
}

function showDecisionBar() {
    $('#tools').fadeOut(300, function() {
        $('.decision').fadeIn(300);
    });

}

function showToolsBar() {
    $('.decision').hide();
    $('.add_new_folder').hide();
    $('#trash').hide();
    $('#tools').fadeIn(400);
}

// New Folder section
function showNewFolderBar() {
    $('#tools').hide(300, function() {
        $('.add_new_folder').fadeIn(300);
    });
}

// trash icon
function showTrashIcon() {
    $("#trash").show();
    $("#trash").animate({
        top: 500,
        opacity: 1
    }, 500);
}

function hideTrashIcon() {
    $("#trash").animate({
        top: 560,
        opacity: 0
    }, 250);
}
