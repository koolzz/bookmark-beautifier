function printBookmarks(callbackList, showChildren) {
    chrome.bookmarks.getTree(function(root) {
        $('#bookmarks').empty();
        ROOT_TABS = root[0].children.length;
        root.forEach(function(folder) {
            $('#bookmarks').append(printBookmarkFolder(folder, showChildren));
            $('#bookmarks .bFolder').each(function(index, val) {
                val = $(val).parent();
                var depth = $(val).parents("ul").length,
                    padding = 20;
                $(val).children().find('a').css('padding-left', depth * padding + 13);
            });
            if (callbackList) {
                for (var i = 0, len = callbackList.length; i < len; i++) {
                    callbackList[i]();
                }
            }
        });
    });
}

function printBookmarkFolder(bookmarkFolder, notShowChildren) {
    var list = $("<ul>");
    bookmarkFolder.children.forEach(function(bookmark) {
        if (typeof bookmark.url != 'undefined') {
            list.append(printNode(bookmark));
        } else {
            var folder = printNodeFolder(bookmark),
                r = $("<img src=\"icons/right.png\" class=\"dropIcon\">");

            $(folder).find("a").prepend(r);
            folder.append(printBookmarkFolder(bookmark, notShowChildren));
            list.append(folder);
            $(r).click(function(e) {
                toggleFolder($(e.currentTarget).parent().parent());
            });
            if (notShowChildren)
                return;
            if (bookmark.id > ROOT_TABS || bookmark.id === undefined) {
                $(folder).children().hide();
                $(folder).find('.dropIcon').show();
                $(folder).find('a').css('display', 'inline-block');
            } else {
                $(folder).children('a').find('.dropIcon').attr('src', 'icons/down.png');
                $(folder).children('a').first().addClass("root_folder");


            }

        }
    });
    return list;
}

function printNode(bookmark) {
    var li = $("<li>")
        .attr('class', 'bLink');
    var link = $("<a />", {
        href: bookmark.url,
        text: bookmark.title
    });
    li.append(link);

    var hostname = $('<a>').prop('href', bookmark.url).prop('hostname');
    li.find("a").prepend("<img class=\"linkIcon\" src=" + ("https://www.google.com/s2/favicons?domain=" + hostname) + "/>")

    return li;
}

function printNodeFolder(bookmark) {
    var li = $("<li>");
    var link = $("<a />", {
        text: bookmark.title
    });
    link.addClass('bFolder');
    li.append(link);
    return li;
}

function previewFunction(callbackFunction) {
    hideTrashIcon();
    var keys = {
        children: []
    };
    chrome.bookmarks.getTree(function(root) {
        root[0].children.forEach(function(folder) {
            keys.children.push(folder);
        });
        showDecisionBar();
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
                    if (printAfter && key === list.children.length - 1)
                        updateBookmarks(folder, true);
                    else
                        updateBookmarks(folder, false);
                });
                return;
            } else {
                if (key === list.children.length - 1)
                    updateBookmarks(folder, true);
                else
                    updateBookmarks(folder, false);
            }
        }

        if (folder.id <= ROOT_TABS) {
            if (printAfter && key === list.children.length - 1) {
                printBookmarks([sortableList]);
            }
            return;
        }

        if (folder.rename) {
            chrome.bookmarks.update(String(folder.id), {
                'title': folder.title
            });
        }
        chrome.bookmarks.move(String(folder.id), {
            'parentId': folder.parentId,
            'index': key
        }, function callback() {
            console.log(printAfter + " " + key + " " + list.children.length);
            if (printAfter && key === list.children.length - 1) {
                printBookmarks([sortableList]);
            }
        });
    });
}

function updateBookmarkListBuffer(keys) {
    $('#bookmarks').empty();
    $('#bookmarks').append(printBookmarkFolder(keys));
    $('#bookmarks .bFolder').each(function(index, val) {
        var depth = $(val).parents("ul").length,
            padding = 20;
        $(val).siblings().find('a').css('padding-left', depth * padding + 13);
    });
    $('#reject').one("click", function(e) {
        e.preventDefault();
        $('#apply').unbind("click");
        printBookmarks([sortableList]);
        showToolsBar();
    });
    $('#apply').one("click", function(e) {
        e.preventDefault();
        $('#reject').unbind("click");
        updateBookmarks(keys, true);
        showToolsBar();
    });
}

function showFolderChildren() {
    $("#bookmarks ul").each(function(key, e) {
        var parentTitle = $(e).siblings('a').text();
        if (parentTitle === "Bookmarks bar" || parentTitle === "Other bookmarks" || parentTitle === "Mobile bookmarks")
            return;
        if (!$(e).is(":visible")) {
            $(e).slideDown(300, function() {
                $(e).siblings('a').find('.dropIcon').attr('src', 'icons/down.png');
            });
        }
    });
}

function hideFolderChildren() {
    $("#bookmarks ul").each(function(key, e) {
        if (key > 0) {
            var parentTitle = $(e).siblings('a').text();
            if (parentTitle === "Bookmarks bar" || parentTitle === "Other bookmarks" || parentTitle === "Mobile bookmarks")
                return;
            $(e).slideUp(300, function() {
                $(e).siblings('a').find('.dropIcon').attr('src', 'icons/right.png');
            });
        }
    });
}

function toggleFolder(folder) {
    if (folder.children('ul').is(":visible")) {
        folder.children('a').find('.dropIcon').attr('src', 'icons/right.png');
        folder.children('ul').slideUp(400);
    } else {
        folder.children('a').find('.dropIcon').attr('src', 'icons/down.png');
        folder.children('ul').slideDown(400);
    }
}

function showFolder(folderName) {
    var elements = $('#bookmarks').find('a');
    var folder = elements.filter(function() {
        return $(this).text() == folderName;
    }).parent();

    folder.children('a').find('.dropIcon').attr('src', 'icons/down.png');
    folder.children('ul').show();
}
