function printBookmarks(callbackList, showChildren) {
    chrome.bookmarks.getTree(function(root) {
        //console.log(root);
        $('#bookmarks').empty();
        ROOT_TABS = root[0].children.length;
        FIRST_TABS = root[0].children[0].children.length;
        root.forEach(function(folder) {
            $('#bookmarks').append(printBookmarkFolder(folder, showChildren));
            $('#bookmarks .bFolder').each(function(index, val) {
                var depth = $(val).parents("ul").length,
                    padding = 20;
                if (root.id > FIRST_TABS) {
                    $(val).children().find('a').css('padding-left', depth * padding);
                } else {
                    $(val).children().find('a').css('padding-left', depth * padding + 13);
                }

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
            var folder = printNodeFolder(bookmark);

            if (bookmark.id > ROOT_TABS) {
                var r = $("<i class=\"fa\"><img src=\"icons/right.png\" class=\"dropIcon\"></i>");
                $(folder).find("a").prepend(r);
            } else {
                var r = $("<i class=\"fa\"><img src=\"icons/right.png\" class=\"dropIcon\" id=\"root\"> </i>");
                $(folder).find("a").prepend(r);
            }
            folder.append(printBookmarkFolder(bookmark, notShowChildren));
            if (EDIT_MODE && bookmark.children.length === 0)
                folder.addClass("is-empty");
            list.append(folder);
            $(r).click(function(e) {
                if ($(folder).find('li').is(':visible')) {
                    $('.dropIcon', this).attr('src', 'icons/right.png');
                    $(folder).children().hide();
                    $(folder).find('.dropIcon').show();
                    $(folder).find('a').css('display', 'inline-block');
                } else {
                    $('.dropIcon', this).attr('src', 'icons/down.png');
                    $(folder).children().show();
                }

            });
            if (notShowChildren)
                return;
            if (bookmark.id > ROOT_TABS) {
                $(folder).children().hide();
                $(folder).find('.dropIcon').show();
                $(folder).find('a').css('display', 'inline-block');
            } else {
                $(folder).children('a').find('.dropIcon').attr('src', 'icons/down.png');
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
    var li = $("<li>")
        .attr('class', 'bFolder');
    var link = $("<a />", {
        text: bookmark.title
    });
    li.append(link);
    return li;
}

function previewFunction(callbackFunction) {
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

function updateBookmarkListBuffer(keys) {
    $('#bookmarks').empty();
    $('#bookmarks').append(printBookmarkFolder(keys));
    $('#bookmarks .bFolder').each(function(index, val) {
        var depth = $(val).parents("ul").length,
            padding = 20;
        if (root.id > FIRST_TABS) {
            $(val).children().find('a').css('padding-left', depth * padding);
        } else {
            $(val).children().find('a').css('padding-left', depth * padding + 13);
        }
    });
    $('#reject').one("click", function(e) {
        e.preventDefault();
        $('#apply').unbind("click");
        printBookmarks();
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
