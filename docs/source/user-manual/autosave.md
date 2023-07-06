---
myst:
  html_meta:
    "description": "User manual for how Volto autosaves data in Plone 6 frontend."
    "property=og:description": "User manual for how Volto autosaves data in Plone 6 frontend."
    "property=og:title": "How to autosave content in Volto for edit, add and comments"
    "keywords": "Volto, Plone, frontend, React, User manual, autosave"
---

(autosave-content-label)=

# Autosave content
Autosave feature allows you to load locally saved data in case of accidental close, refresh, close or change page.
- It uses localstorage and clears the data once either the Form is saved or you cancel loading the local data.
- If local data is found for the specific content a toast is shown that allows you to either load (OK) or discard (Cancel).
- If local data is stale, it will still show the toast, but it will specify that the found data is less recent than the server one.

(autosave-edit-mode-label)=
## Autosave edit mode
A local copy of the form is saved in localStorage when the users start to edit, not at simply opening the page in edit mode.
Changing the form will update the localStorage with a new complete copy of the Form.
In case of closing the tab, refreshing, changing the page, cancelling edit, when revisiting the page in edit mode, it will show a toast for the found data.
Data is saved with an unique id:
```js
  const id = isEditForm
    ? ['form', type, pathname].join('-') // edit
    : type
    ? ['form', pathname, type].join('-') // add
    : schema?.properties?.comment
    ? ['form', pathname, 'comment'].join('-') // comments
    : ['form', pathname].join('-');
```
Local data for the current content will be deleted in case of saving the Form or choosing cancel from the toast.

(autosave-add-content-label)=
## Autosave add new content
When adding a new content, a copy of the form will be saved in localStorage, similar to edit mode, but since the content hasn't been saved, we don't have an id, in this case the content type will be used.
Since it also uses the path to create the id, the local data will be loaded again, in case of exiting without saving, only if adding the same content, in the same path.

(autosave-comments-label)=
## Autosave comments
Comments are also saved locally even though we are not in edit mode or add.
After loading local data if comment is submitted, it will deleted from localStorage.