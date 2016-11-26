$().ready(function() {
    printBookmarks('1');
    $("#sort").click(function(e) {
        $("#bookmarks ul").empty();
        sortBookmarks('1');
    });
    $("#group").click(function(e) {
        $("#bookmarks ul").empty();
        groupBookmarks('1');
    });
    $("#crop").click(function(e) {
        $("#bookmarks ul").empty();
        cropBookmarks('1');
    });
});

function printBookmarks(id) {
    chrome.bookmarks.getChildren(id, function(children) {
        children.forEach(function(bookmark) {
            //console.log(bookmark);
            $("#bookmarks ul").append("<li>" + bookmark.title + "</li>");
            //printBookmarks(bookmark.id); //for folders, don't uncomment as leads do multiple outputs.
        });
    });
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
            $("#bookmarks ul").append("<li>" + value.title + "</li>");
        });
    });
}

function groupBookmarks(id) {
    var keys = [];
    var dictionary = [];
    chrome.bookmarks.getChildren(id, function(children) {
        children.forEach(function(bookmark) {
            keys.push(bookmark);

            if (typeof bookmark.url != 'undefined') {
                var website = bookmark.url.split('.')[1];

                //creates an array of results, but we only have 2 cases empty or 1 element
                var result = $.grep(dictionary, function(e) {
                    return e.key == website;
                });

                //for 0 create new entry, else increment excisting entry
                if (result == 0) {
                    dictionary.push({
                        key: String(website),
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
        console.log(dictionary);
        $.each(dictionary, function(key, value) {
            if (value.value > 1) {
                addFolder('1', value.key, addLinksToFolder, dictionary[key].bookmarkList);
            }
        });
    });
}

function addLinksToFolder(newFolder, list) {
    var parentId = newFolder.id;
    var name = newFolder.title;
    $("#main").append("<li><span>" + name + "</span>" + "<ul id=\"" + name + "\"></ul></li>");
    $.each(list, function(key, value) {
        console.log(value.title);
        chrome.bookmarks.move(String(value.id), {
            'parentId': parentId,
            'index': key
        });
        $("#" + name).append("<li>" + value.title + "</li>");
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
    chrome.bookmarks.create({
            'parentId': parentId,
            'title': title
        },
        function(newFolder) {
            console.log("added folder: " + newFolder.title);
            callback(newFolder, list);
        });
}
