$().ready(function() {
    'use strict';

    printBookmarks();

    $("#sort").click(function(e) {
        sortBookmarks('1', true);

    });
    $("#group").click(function(e) {
        groupBookmarks('1');

    });
    $("#crop").click(function(e) {
        cropBookmarks('1');

    });
    $("#bookmarks").on('dblclick', 'li', function(e) {
        if($('#bookmarks').find('.editSelectedVal').length != 0)
            return;
        e.stopPropagation();
        updateVal($(this), $(this).html());
    });
});

var ROOT_TABS;

function printBookmarks() {

    $('#bookmarks').empty();
    chrome.bookmarks.getTree(function(root) {
        //console.log(root);
        ROOT_TABS = root[0].children.length;
        root.forEach(function(folder) {
            $('#bookmarks').append(printBookmarkFolder(folder));
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
                list.append(printNode(bookmark)
                    .css('font-weight', 'bold'));
                list.append(printBookmarkFolder(bookmark));
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
        .text(bookmark.title);
    return li;
}

function sortBookmarks(id, printAfter) {
    var keys = [];
    chrome.bookmarks.getChildren(id, function(children) {
        children.forEach(function(bookmark) {
            keys.push(bookmark);

            if (bookmark.children !== 'undefined') {
                sortBookmarks(bookmark.id, false);
            }
        });
        keys.sort(sortByName)
        $.each(keys, function(key, value) {
            if (key == keys.length - 1 && printAfter == true) {
                print = false;
                chrome.bookmarks.move(String(value.id), {
                    'parentId': id,
                    'index': key
                }, function printCallback() {
                    printBookmarks();
                });
            }
            chrome.bookmarks.move(String(value.id), {
                'parentId': id,
                'index': key
            });
        });

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
    var updatedGroups = 0; //added groups
    chrome.bookmarks.getChildren(id, function(children) {
        children.forEach(function(bookmark) {
            keys.push(bookmark);

            if (typeof bookmark.url != 'undefined') {
                var domain = getHostname(bookmark.url);

                //creates an array of results, nly have 2 cases empty or 1 element
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
                    if (result[0].value == 1)
                        updatedGroups++;
                    result[0].value++;
                    result[0].bookmarkList.push(bookmark);
                }
            }
        });
        var i = 0;
        $.each(dictionary, function(key, value) {
            if (value.value > 1) {
                i++;
                if (i == updatedGroups)
                    addFolder('1', capitalizeFirstLetter(getFolderName(value.key)), addLinksToFolder, dictionary[key].bookmarkList, true);
                else
                    addFolder('1', capitalizeFirstLetter(getFolderName(value.key)), addLinksToFolder, dictionary[key].bookmarkList, false);
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

function addFolder(parentId, title, callback, list, printAfter) {
    console.log("looking for " + title);
    chrome.bookmarks.search(String(title), function(result) {
        var folderFound = false;
        result.forEach(function(node) {
            if (typeof node.url === 'undefined' && node.title === title) {
                console.log("found " + node.title);
                callback(node, list, printAfter);
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
                    callback(newFolder, list, printAfter);
                });
        }
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
    $(document).click("click", function(e) {
        if ($(e.target).is(".editSelectedVal")){
        //if ( $(this).hasClass(".editSelectedVal")){
            console.log($(this));
            return;
        }else{
            $(".editSelectedVal").parent("li").html(oldVal);
            $(document).unbind( "click" );
        }
    });

}
