
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
