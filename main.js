// Test it on https://love2d.org/wiki/love.thread.newThread
// TODO: dl notes: https://love2d.org/wiki/GraphicsFeature
// TODO: box notes: https://love2d.org/wiki/love.event.push

var picker = document.createElement('select')

picker.onchange = function () {
    applyFilter(this.options[this.selectedIndex].value)
}

function array (a) {
    return [].slice.apply(a || [])
}

var pickerVersions = {}

function injectPickerOption (version, text) {
    if (pickerVersions[version]) {
        return
    }
    pickerVersions[version] = true
    
    var option = document.createElement('option')
    
    option.value = version
    option.textContent = text
    picker.appendChild(option)
}

function makeWrapper () {
    var wrapper = document.createElement('div')
    
    wrapper.setAttribute('data-love-filterable', true)
    
    return wrapper
}

function wrapSections () {
    var element = document.querySelector('h2')
    var wrapper
    
    while (element) {
        var next = element.nextSibling
        if (element.nodeName == 'H2') {
            wrapper = makeWrapper()
            element.parentNode.insertBefore(wrapper, element)
        }
        wrapper.appendChild(element)
        element = next
    }
}

function updateSectionFromNote (section, note) {
    if (note.textContent.match(/available since/i)) {
        var a = note.querySelector('a')
        section.setAttribute('data-love-version-added', a.title)
        note.setAttribute('data-love-version-note', true)
    }
    if (note.textContent.match(/removed in/i)) {
        var a = note.querySelector('a')
        section.setAttribute('data-love-version-removed', a.title)
        note.setAttribute('data-love-version-note', true)
    }
}

function QueryIterator (query) {
    return function (callback) {
        return array(document.querySelectorAll(query)).forEach(callback)
    }
}

var withSections = QueryIterator('*[data-love-filterable]')
var withAdded = QueryIterator('*[data-love-version-added]')
var withRemoved = QueryIterator('*[data-love-version-removed]')
var withNotes = QueryIterator('*[data-love-version-note]')

function hideNotes () {
    withNotes(function (note) { note.style.display = 'none' })
}

function showNotes () {
    withNotes(function (note) { note.style.display = null })
}

var needsFilter = false

function scanSections () {
    withSections(function (section) {
        var note = section.querySelector('table')
        if (!note) {
            return
        }
        updateSectionFromNote(section, note)
        while (note.nextSibling && note.nextSibling.tagName == 'TABLE') {
            note = note.nextSibling
            updateSectionFromNote(section, note)
        }
        needsFilter = true
    })
}

function scanTables () {
    var added = document.querySelectorAll('.smwtable *[alt="Added since"] + *')
    var removed = document.querySelectorAll('.smwtable *[alt="Removed in"] + *')
    
    array(added).forEach(function (a) {
        var e = a.parentNode.parentNode
        e.setAttribute('data-love-filterable', true)
        e.setAttribute('data-love-version-added', a.title)
        needsFilter = true
    })
    array(removed).forEach(function (a) {
        var e = a.parentNode.parentNode
        e.setAttribute('data-love-filterable', true)
        e.setAttribute('data-love-version-removed', a.title)
        needsFilter = true
    })
}

// return true if 'installed' is greater than or equal to 'required'
// http://stackoverflow.com/a/6832670
function compareVersions (installed, required) {
    var a = installed.split('.');
    var b = required.split('.');

    for (var i = 0; i < a.length; ++i) {
        a[i] = Number(a[i]);
    }
    for (var i = 0; i < b.length; ++i) {
        b[i] = Number(b[i]);
    }
    if (a.length == 2) {
        a[2] = 0;
    }

    if (a[0] > b[0]) return true;
    if (a[0] < b[0]) return false;

    if (a[1] > b[1]) return true;
    if (a[1] < b[1]) return false;

    if (a[2] > b[2]) return true;
    if (a[2] < b[2]) return false;

    return true;
}

function filterVersion (installed) {
    filterAll(hideNotes)
    withAdded(function (section) {
        var required = section.getAttribute('data-love-version-added')
        if (!compareVersions(installed, required)) {
            section.style.display = 'none'
        }
    })
    withRemoved(function (section) {
        var removed = section.getAttribute('data-love-version-removed')
        if (compareVersions (installed, removed)) {
            section.style.display = 'none'
        }
    })
}

function filterAll (hideOrShowNotes) {
    hideOrShowNotes()
    withSections(function (section) { section.style.display = null })
}

function filterLatest () {
    filterAll(hideNotes)
    withRemoved(function (section) { section.style.display = 'none' })
}

function applyFilter (value) {
    if (value == 'all') {
        filterAll(showNotes)
        return
    }
    if (value == 'latest') {
        filterLatest()
        return
    }
    filterVersion(value)
}

function injectFilterPicker () {
    var target = document.getElementById('ca-nstab-main').parentNode
    
    picker.style.position = 'absolute'
    picker.style.right = 0
    picker.style.height = target.parentNode.offsetHeight - 8 + 'px'
    picker.style.margin = '4px'
    
    target.parentNode.insertBefore(picker, target)
}

function injectVersionTag (number, name) {
    injectPickerOption(number, 'Version ' + number + ': ' + name)
}

function injectVersionTags () {
    var url = '/w/index.php?title=Version_History&action=raw';
    var xhr = new XMLHttpRequest()
    xhr.onload = function () {
        var re = /\[\[([\d.]+)\]\][^\n]*\n[^\|]*\|(.*)\n/gm
        var m
        
        while (m = re.exec(this.responseText)) {
            injectVersionTag(m[1], m[2])
        }
    }
    xhr.open('get', url, true)
    xhr.send()
}

function main () {
    wrapSections()
    scanSections()
    scanTables()
    if (!needsFilter) {
        return
    }
    injectPickerOption('all', 'All Versions')
    injectPickerOption('latest', 'Latest Version')
    injectVersionTags()
    injectFilterPicker()
}

main()
