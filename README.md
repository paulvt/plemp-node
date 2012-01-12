Plemp!
======

Create your own online pile of junk!  Plemp allows you to upload/put stuff
on a single canvas, for sharing, collaging or any purpose you can think of.

Features
--------

* Adding content by means of typing/pasting text
* Uploading of image/music/video/code/text files
* (Re)arranging of the files (not yet persistent cross sessions)
* Some visual effects for eye candy purposes
* Syntax highlighting of source code files

The following feature is planned but has not been ported from the previous
Camping/Ruby application yet:

* Distributed management of the arrangement, i.e. everybody viewing the
  Plemp page will (with some delay) see the same arrangement

Requirements
------------

Plemp! is an Express (on node.js) application, so you need:

* Node.js (>= 0.4.12) with
  - Express (>= 2.5.0)
  - Connect-Form (>= 0.2.0)
* JQuery (>= 1.7.0)
* JQuery UI (>= 1.8.16)

Installation
------------

For now, Plemp! is in a developing state and not ready for site-wide
deployment yet.  However, before running, make sure that jquery.js and are
available from public/ either by copying or symlinking them there.

Usage
-----

Run from the command line:

    $ node plemp.js

and head over to http://localhost:3300/ to view and use the Plemp! canvas.

Files can be upload or text can be pasted using the Add/Upload Dialog
invoked by pressing the Plus key or the Plus button in the top-right
corner.  Once uploaded, the objects can be arranged by dragging them
around.

License
-------

Plemp! is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

*N.B.* The source code of this program includes code from the highlight.js
library (see http://softwaremaniacs.org/soft/highlight/en/), which is
licensed under the 3-clause BSD license: 
https://github.com/isagalaev/highlight.js/blob/master/LICENSE.
This pertains to the following files:

* public/javascripts/highlight.pack.js
* public/stylesheets/highlight.css
