function printBookmarks(makeSortable) {
    chrome.bookmarks.getTree(function(root) {
        //console.log(root);
        $('#bookmarks').empty();
        ROOT_TABS = root[0].children.length;
        root.forEach(function(folder) {
            $('#bookmarks').append(printBookmarkFolder(folder)
                .css('padding-right', "2px"));
            if (makeSortable)
                sortableList();
        });
    });
}

function printBookmarkFolder(bookmarkFolder) {
    var list = $("<ul>");
    bookmarkFolder.children.forEach(function(bookmark) {
        if (typeof bookmark.url != 'undefined') {
            list.append(printNode(bookmark));
        } else {
            var folder = printNodeFolder(bookmark);
            var r = $("<button type=\"submit\" class=\"dropIcon\"><i class=\"fa fa-angle-double-down fa-lg\"></i></button>");
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
        }
    });
    return list;
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
