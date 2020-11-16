const   SYSTEM_ENTRY        = 0,
        COLLECTION_ENTRY    = 1

class CollectionEntry {
    constructor(type, group, name) {
        this._type  = type
        this._group = group
        this._name  = name
    }
    get type() {
        return this._type
    }
    get group() {
        return this._group
    }
    get name() {
        return this._name
    }
    is(o) {
        return o.type === this.type && o.group === this.group && o.name === this.name
    }
}

class Collection {
    constructor() {
        this._title = 'Untitled Collection'
        this._entries = []
    }
    addCollectionEntry(group, name) {
        let entry = new CollectionEntry(COLLECTION_ENTRY, group, name)
        if (this.entryExists(entry)) return
        this._entries.push(entry)
        return this._entries.length-1
    }
    addSystemEntry(group, name) {
        let entry = new CollectionEntry(SYSTEM_ENTRY, group, name)
        if (this.entryExists(entry)) return
        this._entries.push(entry)
        return this._entries.length-1
    }
    entryExists(entry) {
        for (const ent of this._entries) {
            if (entry.is(ent)) {
                return true
            }
        }
        return false
    }
}

export {
    Collection,
    CollectionEntry,
    SYSTEM_ENTRY,
    COLLECTION_ENTRY
}