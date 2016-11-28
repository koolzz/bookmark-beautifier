$().ready(function() {
    'use strict';

    printBookmarks();

    $("#sort").click(function(e) {
        sortBookmarks('1');

    });
    $("#group").click(function(e) {
        groupBookmarks('1');

    });
    $("#crop").click(function(e) {
        cropBookmarks('1');

    });
});





function printBookmarks() {
    $("#bookmarks ul").empty();
    chrome.bookmarks.getTree(function(children) {

        children.forEach(function(main) {

            $('#bookmarks').append(printBookmarkNode(main));

        });
    });
}

function deleteFolder(bookmarkFolder) {
    bookmarkFolder.children.forEach(function(bookmark) {
        if (typeof bookmark.url == 'undefined') {
            if (bookmark.children.length == 0 && bookmark.parentId != 0) {
                chrome.bookmarks.remove(bookmark.id, function(children) {})
            }
        }
    });
}

function printBookmarkNode(bookmarkFolder) {
    var list = $("<ul>");
    bookmarkFolder.children.forEach(function(bookmark) {
        deleteFolder(bookmarkFolder);
        if (typeof bookmark.url != 'undefined') {
            list.append(printNode(bookmark));
            //$("#main").append("<li>" + bookmark.title + "</li>");
        } else {
            if (bookmark.children.length != 0) {
                list.append(printNode(bookmark)
                    .css('font-weight', 'bold'));
                list.append(printBookmarkNode(bookmark));
            }
        }
    });
    return list;
}

function printNode(bookmark) {
    var li = $("<li>")
        .text(bookmark.title);
    return li;
}

function sortBookmarks(id) {
    var keys = [];
    chrome.bookmarks.getChildren(id, function(children) {
        children.forEach(function(bookmark) {
            keys.push(bookmark);
            //sortBookmarks(bookmark.id); //for folders, don't uncomment as leads do multiple outputs.
        });
        keys.sort(sortByName)
        $.each(keys, function(key, value) {
            console.log(value.title);
            chrome.bookmarks.move(String(value.id), {
                'parentId': '1',
                'index': key
            });
        });
        printBookmarks();
    });
}

function cropBookmarks(id) {
    chrome.bookmarks.getChildren(id, function(children) {
        children.forEach(function(bookmark) {
            var oldTitle = bookmark.title;

            if (bookmark.title.length > 10) {
                oldTitle = stripPunctuation(oldTitle);
                var newTitle = oldTitle.split(" ")[0] + " " + oldTitle.split(" ")[1]; //just take the first 2 words(temporary solution)
                chrome.bookmarks.update(String(bookmark.id), {
                    'title': newTitle
                });
            }
        });

        printBookmarks();
    });
}

function groupBookmarks(id) {
    var keys = [];
    var dictionary = [];
    chrome.bookmarks.getChildren(id, function(children) {
        children.forEach(function(bookmark) {
            keys.push(bookmark);

            if (typeof bookmark.url != 'undefined') {
                var domain = getHostname(bookmark.url);


                //creates an array of results, but we only have 2 cases empty or 1 element
                var result = $.grep(dictionary, function(e) {
                    return e.key == domain;
                });

                //for 0 create new entry, else increment excisting entry
                if (result == 0) {
                    dictionary.push({
                        key: String(domain),
                        value: 1,
                        bookmarkList: [bookmark]

                    });

                } else {
                    result[0].value++;
                    result[0].bookmarkList.push(bookmark);
                }

            }
            //sortBookmarks(bookmark.id); //for folders, don't uncomment as leads do multiple outputs.
        });

        $.each(dictionary, function(key, value) {
            if (value.value > 1) {
                addFolder('1', capitalizeFirstLetter(getFolderName(value.key)), addLinksToFolder, dictionary[key].bookmarkList);
            }
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

function stripPunctuation(string) { //god bless stackowerflow
    var punctuationless = string.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    var finalString = punctuationless.replace(/\s{2,}/g, " ");
    return finalString
}

function addLinksToFolder(newFolder, list) {
    var parentId = newFolder.id;
    var name = newFolder.title;

    var length = list.length;
    //$("#main").append("<li><span>" + name + "</span>" + "<ul id=\"" + name + "\"></ul></li>");
    $.each(list, function(key, value) {

        console.log(value.title);
        var subli = $("<li>")
            .text = value.title;

        chrome.bookmarks.move(String(value.id), {
            'parentId': parentId,
            'index': key
        }, function(done) {
            if (key == length - 1)
                printBookmarks();
        });
        //$("#" + name).append("<li>" + value.title + "</li>");
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

function addFolder(parentId, title, callback, list) {
    console.log("looking for " + title);
    chrome.bookmarks.search(String(title), function(result) {
        var folderFound = false;
        result.forEach(function(node) {
            if (typeof node.url === 'undefined' && node.title === title) {
                console.log("found " + node.title);
                callback(node, list);
                folderFound = true;
                return false;
            }
        });
        if (!folderFound) {
            chrome.bookmarks.create({
                    'parentId': parentId,
                    'title': title
                },
                function(newFolder) {
                    console.log("added folder: " + newFolder.title);
                    callback(newFolder, list);
                });
        }
    });
}
