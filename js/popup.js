var ROOT_TABS;
var EDIT_MODE = false;

$().ready(function() {
    'use strict';

    $(window).blur(function() {
        window.close;
    });

    printBookmarks();
    //deleteEmptyFolder();

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
            showEditButtons();
            $("#bookmarks, .selectedLink").removeClass('selectedLink');
            $(".panel-heading").css("background-color", "#CF995F");
        } else {
            hideEditButtons();
            $(".panel-heading").css("background-color", "#009688");
        }
    });

    $('#add-folder').click(function(e) {
        showSearchLine();
    })

    $("#search").keyup(function() {
        if (EDIT_MODE) {
            $(this).keypress(function(e) {
                if (e.which == 13) {
                    if ($(this).val().trim().length != 0) {
                        addNewButton($(this).val().trim());
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

function sortableList() {

    $("#bookmarks ul").each(function(key, e) {
        var group = key > 0 ? "subfolders" : "mainfolder";
        Sortable.create(e, {
            group: group,
            animation: 150,
            onUpdate: function(evt) {
                var item = evt.item;
                var parent = $(item).parent();
                var href = item.children[0].href;
                var title = $(item).context.innerText;
                var index = evt.newIndex < evt.oldIndex ? evt.newIndex : evt.newIndex + 1;
                chrome.bookmarks.search({
                    'url': href,
                    'title': title
                }, function(result) {
                    var folder = result[0];
                    chrome.bookmarks.move(folder.id, {
                        'parentId': folder.parentId,
                        'index': index
                    }, function() {
                        printBookmarks(true);
                    });
                });
            },
            onAdd: function(evt) {
                var item = evt.item;
                var old = evt.from;
                var parentTitle = $(item).parent().parent().contents().filter(function() {
                    return this.nodeType == 3;
                })[0].nodeValue;
                var href = item.children[0].href;
                var title = $(item).context.innerText;
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
                            printBookmarks(true);
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

function showEditButtons() {
    $(".search").slideUp(400, function print() {
        printBookmarks(true);
    });
    $("#add-folder").fadeIn(400);
    $("#trash").fadeIn(400);
    $("#search").val('');
}

function hideEditButtons() {
    $(".search").slideDown(400, function print() {
        printBookmarks(false);
    });
    $("#add-folder").fadeOut(400);
    $("#trash").fadeOut(400);
    $("#search").val('');
    $('#search').attr("placeholder", "Type bookmark name");
}

function showSearchLine() {
    $(".search").slideDown(400);
    $('#search').attr("placeholder", "New folder name");
}

function addNewButton(name) {
    chrome.bookmarks.create({
        'parentId': '1',
        'title': name
    }, function callback() {
        printBookmarks();
    });
}
