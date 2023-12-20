'use strict';

(function () {

    var BASE64_MARKER = ';base64,';

    var optimizeSVGForDownload = true ;
    var includeWaveJSInMetadata = true ;
    var pngscalef = 20 ;

    function convertDataURIToBinary(dataURI) {
        var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        var base64 = dataURI.substring(base64Index);
        var raw = window.atob(base64);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));
        var i;
        for (i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }
        return array;
    }

    function delta (root, name) {
        if (root && root[name]) {
            var res = Number(root[name]);
            if ((res !== 1) && (res !== -1)) { return 0; }
            return res;
        }
        return 0;
    }

    function ring (name, inc, size, init) {
        var res;
        res = parseInt(localStorage [name]);
        if (res || res === 0) {
            res += inc;
            if (res >= size) {
                res -= size;
            } else if (res < 0) {
                res += size;
            }
        } else {
            res = init;
        }
        localStorage [name] = res;
        return res;
    }

    function setStyle (id, prop) {
        var e = document.getElementById(id);
        e.removeAttribute('style');
        for (var p in prop) {
            e.style [p] = prop [p];
        }
    }

    function editorState (op) {
        var drot = delta(op, 'rot');
        var dper = delta(op, 'per');
        var rot = ring('drom.editor.rot', drot, 4, 0);
        var per = ring('drom.editor.per', dper, 7, 3);
        var sizeTXT = ((per + 2) * 10) + '%';
        var sizeSVG = ((8 - per) * 10) + '%';

        var styleTXT, styleSVG;
        if (rot === 1) {        // SVG|TXT
            styleSVG = {width: sizeSVG, height: '100%', cssFloat: 'left', overflow: 'hidden'};
            styleTXT = {height: '100%'};
        } else if (rot === 2) { // SVG/TXT
            styleSVG = {width: '100%', height: sizeSVG, overflow: 'hidden'};
            styleTXT = {height: sizeTXT};
        } else if (rot === 3) { // TXT|SVG
            styleSVG = {width: sizeSVG, height: '100%', cssFloat: 'right', overflow: 'hidden'};
            styleTXT = {width: sizeTXT, height: '100%'};
        } else {                // TXT/SVG
            styleSVG = {width: '100%', height: sizeSVG, position: 'absolute', bottom: 0, overflow: 'hidden'};
            styleTXT = {height: sizeTXT};
        }
        setStyle('SVG', styleSVG);
        setStyle('TXT', styleTXT);
        WaveDrom.EditorRefresh();
    }

    function editorInit () {
        if (document.location.search) {
            const queryString = window.location.search ;
            const urlParams = new URLSearchParams(queryString);
            const inputFile = urlParams.get('loadfile');

            if (inputFile !== undefined) {
                fetch(inputFile).then(response => response.text()).then((data) => {
                    let svg = document.getElementsByTagName('svg')[0] ;
                    svg.innerHTML = data ;
                    let waveJSSegment = svg.getElementById("WaveJS") ;
                    if (waveJSSegment === null) {
                        WaveDrom.cm.setValue(data);
                    } else {
                        let cmContents = waveJSSegment.innerHTML.replace(/^[\s\S]+<!--/,'').replace(/-->[\s\S]+$/,'');
                        WaveDrom.cm.setValue(cmContents);
                    }
                });
            } else {
                WaveDrom.cm.setValue(decodeURIComponent(window.location.search.substr(1)));
            }
            // document.getElementById ('InputJSON_0').value = decodeURIComponent(window.location.search.substr(1));
        }
        window.ondragover = function(e) { e.preventDefault(); return false; };
        window.ondrop = function(e) { e.preventDefault(); return false; };

        if (typeof process === 'object') { // nodewebkit detection
            var holder = document.getElementById('content');
            holder.ondragover = function () { this.className = 'hover'; return false; };
            holder.ondragend = function () { this.className = ''; return false; };
            holder.ondrop = function (e) {
                e.preventDefault();

                for (var i = 0; i < e.dataTransfer.files.length; ++i) {
                    console.log(e.dataTransfer.files[i].path);
                }
                return false;
            };
        }
        editorState();
    }

    function setFullURL () {
        document.location.search = encodeURIComponent(document.getElementById('InputJSON_0').value);
    }

    function menuOpen (e) {
        function closestById(el, id) {
            while (el.id !== id) {
                el = el.parentNode;
                if (!el) {
                    return null;
                }
            }
            return el;
        }

        var doc = document.getElementById('menux');
        if (closestById(e.target, 'Menu') && (doc.style.display === 'none')) {
            doc.style.display = 'inline';
        } else {
            doc.style.display = 'none';
        }
        document.getElementById("expmenu").style.display = 'none'; 
        document.getElementById("impmenu").style.display = 'none'; 
    }

    function handleSubMenu(litem)  {
        if (litem.op === 'closeall') {
            document.getElementById("expmenu").style.display = 'none'; 
            document.getElementById("impmenu").style.display = 'none'; 
        } else {
            var offsetpos = 68 ;
            if (litem.id === "impmenu") {
                // ensure other submenu is closed
                document.getElementById("expmenu").style.display = 'none'; 
                // imp menu is slightly higher
                offsetpos = 8 ;
            } else {
                document.getElementById("impmenu").style.display = 'none';
            }
            var origmenu = document.getElementById("menux");
            var submenu_rpos = 27 + origmenu.offsetWidth ;
            var submenu_bpos = origmenu.offsetHeight - offsetpos ;
            var doc = document.getElementById(litem.id);
            doc.style.right = submenu_rpos + "px" ;
            doc.style.bottom = submenu_bpos + "px" ;
            doc.style.display = 'block' ;
        }
    }

    function gotoWaveDromHome () {
        window.open('http://wavedrom.com').focus();
    }

    function gotoWaveDromGuide () {
        window.open('tutorial.html').focus();
    }

    async function loadJSON () {

        function chooseFile(name) {
            var chooser = document.querySelector(name);

            chooser.addEventListener('change', function() {
                var fs = require('fs');
                var filename = chooser.value;
                if (!filename) { return; }
                fs.readFile(filename, 'utf-8', function(err, data) {
                    if (err) {
                        console.log('error');
                    }
                    WaveDrom.cm.setValue(data);
                });
            }, false);

            chooser.click();
        }

        if (typeof process === 'object') { // nodewebkit detection
            chooseFile('#fileDialogLoad');
        } else {
            // showOpenFilePicker scheme (works only on Chrome / Edge):            
            let cfse ;
            [cfse] = await window.showOpenFilePicker();
            if (cfse !== undefined) {
                const file = await cfse.getFile();
                const contents = await file.text();
                WaveDrom.cm.setValue(contents);
            }
            
            // chooseFileSystemEntries scheme:
            // let cfse = await window.chooseFileSystemEntries;
            // if (cfse !== undefined) {
            //     // PWA: https://web.dev/native-file-system/#read-file
            //     cfse().then(function (fh) {
            //         if (fh.isFile === true) {
            //             fh.getFile().then(function (file) {
            //                 file.text().then(function (content) {
            //                     WaveDrom.cm.setValue(content);
            //                 });
            //             });
            //         }
            //     });
            // }
        }
    }

    async function loadSVG() {

        function parseSVGforWaveJS (fname, svgString) {

            let svg = document.getElementsByTagName('svg')[0] ;
            svg.innerHTML = svgString ;
            let waveJSSegment = svg.getElementById("WaveJS") ;
            let cmContents = '';
            let defCmContents = '{\n\tsignal:[],\n}\n' ;
            let xRendering = '// Rendering may be unsuccessful, or not as intended.\n' ;
            if (waveJSSegment === null) {
                cmContents = '// Loaded file ' + fname + ' has no valid WaveJS metadata.\n' +
                    '// SVG not exported from WaveDrom, or exported by a legacy version?\n' +
                    defCmContents ;
            } else {
                let metadata = waveJSSegment.innerHTML ;
                const attemptVerMatch = metadata.match(/<!--.* WaveDrom version ([^\n]*)\n/);
                if ((null === attemptVerMatch) || (attemptVerMatch.length != 2)) {
                    cmContents = '// Loaded file ' + fname + ' has malformed WaveJS metadata.\n' +
                        xRendering ;
                } else {
                    if (attemptVerMatch[1] !== window.WaveDrom.version) {
                        cmContents = '// Mismatch between SVG source WaveDrom version and current version.\n' +
                            xRendering ;
                    }
                }
                cmContents = cmContents + metadata.replace(/^[\s\S]+<!--/,'').replace(/-->[\s\S]+$/,'');
            }
            WaveDrom.cm.setValue(cmContents);

        }

        if (typeof process === 'object') { // nodewebkit detection            
            var chooser = document.querySelector('#fileDialogLoad');
            chooser.addEventListener('change', function() {
                var fs = require('fs');
                var filename = chooser.value;
                if (!filename) { return; }
                fs.readFile(filename, 'utf-8', function(err, data) {
                    if (err) {
                        console.log('error');
                    }
                    parseSVGforWaveJS (filename, data);
                });
            }, false);
            chooser.click();
        } else {
            // showOpenFilePicker scheme (works only on Chrome / Edge):            
            let svgf ;
            [svgf] = await window.showOpenFilePicker();
            if (svgf !== undefined) {
                const file = await svgf.getFile();
                const contents = await file.text();
                parseSVGforWaveJS (svgf.name, contents);
                // PWA: https://web.dev/native-file-system/#read-file
            }
        }

    }

    function saveJSON () {
        var a;

        function sjson () {
            return localStorage.waveform;
        }

        function chooseFile(name) {
            var chooser = document.querySelector(name);

            chooser.addEventListener('change', function() {
                var fs = require('fs');
                var filename = this.value;
                if (!filename) { return; }
                fs.writeFile(filename, sjson(), function(err) {
                    if (err) {
                        console.log('error');
                    }
                });
                this.value = '';
            }, false);

            chooser.click();
        }

        if (typeof process === 'object') { // nodewebkit detection
            chooseFile('#fileDialogSave');
        } else {
            var cfse = window.chooseFileSystemEntries;
            if (cfse !== undefined) {
                // PWA: https://web.dev/native-file-system/#write-file
                cfse({
                    type: 'saveFile',
                    accepts: [{
                        description: 'JSON file',
                        extensions: ['json', 'js', 'json5'],
                        mimeType: ['application/json', 'text/javascript', 'text/json5']
                    }]
                }).then(function (fh) {
                    fh.createWriter().then(function (writer) {
                        writer.write(0, sjson()).then(function () {
                            writer.close();
                        });
                    });
                });
            } else {
                a = document.createElement('a');
                a.href = 'data:text/json;base64,' + btoa(sjson());
                a.download = 'wavedrom.json';
                var theEvent = document.createEvent('MouseEvent');
                theEvent.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.dispatchEvent(theEvent);
                a.click();
            }
        }
    }

    const collectUsefulDefs = (node, usefulDefs) => {
        for (const child of node.children) {
            if (child.attributes['xlink:href'] != null) {
                const currDef = child.attributes['xlink:href'].value.replace('#','') ;
                usefulDefs[currDef] = 1 ;
            } else {
                collectUsefulDefs(child,usefulDefs);
            }
        }
    }

    function ssvg () {
        let svg, ser, embedWaveJS, svgString;

        let svgInImg = document.getElementById('WaveDrom_SVGinIMG_0');
        if (svgInImg === null) {
            svg = document.getElementsByTagName('svg')[0];
        } else {
            const svgParser = new DOMParser();
            const rawSvgStr = decodeURIComponent(svgInImg.src).replace('data:image/svg+xml;utf8,','');
            const svgInDoc = svgParser.parseFromString(rawSvgStr,'image/svg+xml');
            svg = svgInDoc.getElementsByTagName('svg')[0];
        }
        embedWaveJS = document.createElementNS("http://www.w3.org/2000/svg", 'metadata');
        embedWaveJS.setAttribute("id","WaveJS");
        embedWaveJS.textContent = '\n<!--// WaveJS rendered using WaveDrom version ' + window.WaveDrom.version + '\n' 
            + WaveDrom.cm.getValue() + '\n-->\n';
        if (includeWaveJSInMetadata) {
            svg.appendChild(embedWaveJS);
        }
        if (optimizeSVGForDownload) {
            // console.time('Optimize SVG')
            const usefulDefs = {};
            collectUsefulDefs(svg.getElementById("waves_0"), usefulDefs);
            const defNode = (svg.getElementsByTagName('defs'))[0] ;
            const defs2Remove = [];
            for (const child of defNode.children) {
                // Remove defs entry only if it is a 'g' element, and is not referenced
                // Avoid markers, as they are referenced by style classes
                if ((usefulDefs[child.id] === undefined) && (child.nodeName === 'g')) {
                    defs2Remove.push(child);
                }
            }
            for (const child of defs2Remove) {
                defNode.removeChild(child);
            }            
            // console.timeEnd('Optimize SVG')
        }
        ser = new XMLSerializer();
        svgString = ser.serializeToString(svg);
        let tagOnString = svgString ;
        if (includeWaveJSInMetadata) {
            svg.removeChild(embedWaveJS);
            let components = svgString.split(/(<metadata[^>]*>)/);
            components[2] = components[2].replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
            tagOnString = components[0] + '\n' + components[1] + components[2] ;
        }
        return '<?xml version="1.0" standalone="no"?>\n'
            + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n'
            + '<!-- Created with WaveDrom -->\n' + tagOnString ;
    }

    function saveSVG () {
        var a;

        function chooseFile(name) {
            var chooser = document.querySelector(name);

            chooser.addEventListener('change', function() {
                var fs = require('fs');
                var filename = this.value;
                if (!filename) { return; }
                fs.writeFile(filename, ssvg(), function(err) {
                    if(err) {
                        console.log('error');
                    }
                });
                this.value = '';
            }, false);
            chooser.click();
        }

        if (typeof process === 'object') { // nodewebkit detection
            chooseFile('#fileDialogSVG');
        } else {
            var cfse = window.chooseFileSystemEntries;
            if (cfse !== undefined) {
                // PWA: https://web.dev/native-file-system/#write-file
                cfse({
                    type: 'saveFile',
                    accepts: [{
                        description: 'SVG file',
                        extensions: ['svg'],
                        mimeType: ['image/svg+xml']
                    }]
                }).then(function (fh) {
                    fh.createWriter().then(function (writer) {
                        writer.write(0, ssvg()).then(function () {
                            writer.close();
                        });
                    });
                });
            } else {
                a = document.createElement('a');
                a.href = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(ssvg())));
                a.download = 'wavedrom.svg';
                var theEvent = document.createEvent('MouseEvent');
                theEvent.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.dispatchEvent(theEvent);
                // a.click();
            }
        }
    }

    function pngdata (done) {

        var img = new Image();
        var canvas = document.createElement('canvas');

        function onload () {
            canvas.width = ((pngscalef + 1) >> 1) * img.width;
            canvas.height = ((pngscalef + 1) >> 1) * img.height;
            var context = canvas.getContext('2d');
            context.drawImage(img, 0, 0);
            var res = canvas.toDataURL('image/png');
            done(res);
        }

        var svgBody = ssvg();
        var svgdata = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgBody)));
        img.src = svgdata;

        if (img.complete) {
            onload();
        } else {
            img.onload = onload;
        }
    }

    function savePNG () {
        var a;

        function chooseFile(name) {
            var chooser = document.querySelector(name);

            chooser.addEventListener('change', function() {
                var fs = require('fs');
                var filename = this.value;
                if (!filename) { return; }
                pngdata(function (data) {
                    data = data.replace(/^data:image\/\w+;base64,/, '');
                    var buf = new Buffer(data, 'base64');
                    fs.writeFile(filename, buf, function(err) {
                        if (err) {
                            console.log('error');
                        }
                    });
                    this.value = '';
                });
            }, false);
            chooser.click();
        }

        if (typeof process === 'object') { // nodewebkit detection
            chooseFile('#fileDialogPNG');
        } else {
            var cfse = window.chooseFileSystemEntries;
            if (cfse !== undefined) {
                // PWA: https://web.dev/native-file-system/#write-file
                cfse({
                    type: 'saveFile',
                    accepts: [{
                        description: 'PNG file',
                        extensions: ['png'],
                        mimeType: ['image/png']
                    }]
                }).then(function (fh) {
                    fh.createWriter().then(function (writer) {
                        pngdata(function (uri) {
                            writer.write(0, convertDataURIToBinary(uri))
                                .then(function () {
                                    writer.close();
                                });
                        });
                    });
                });
            } else {
                a = document.createElement('a');
                pngdata(function (res) {
                    a.href = res;
                    a.download = 'wavedrom.png';
                    var theEvent = document.createEvent('MouseEvent');
                    theEvent.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    a.dispatchEvent(theEvent);
                    // a.click();
                });
            }
        }
    }

    function pdfdata (done) {
        var svgBody = ssvg();

        let svgDim = svgBody.match(/viewBox="0 0 ([^"]*)"/) ;
        let [pagewidth,pageheight] = svgDim[1].split(' ') ;
        let pdfdoc = new PDFDocument( { size: [parseFloat(pagewidth),parseFloat(pageheight)] } ) ;
        console.log(JSON.stringify(pagewidth + ' ' + pageheight));
        let noxmlsvgbody = svgBody.replace(/^[\s\S]+<svg/m,'<svg') ;
        let hiddenDiv = document.getElementById('hidden-div');
        hiddenDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' + 
            noxmlsvgbody + '</svg>';
        SVGtoPDF(pdfdoc,hiddenDiv.firstChild.firstChild, 0, 0, {useCSS: true});
        let stream = pdfdoc.pipe(blobStream());
        stream.on('finish', function() {
            let blob = stream.toBlob('application/pdf');
            done(URL.createObjectURL(blob));
        });
        pdfdoc.end();
    }

    function savePDF () {
        var a;

        function chooseFile(name) {
            var chooser = document.querySelector(name);

            chooser.addEventListener('change', function() {
                var fs = require('fs');
                var filename = this.value;
                if (!filename) { return; }
                pngdata(function (data) {
                    data = data.replace(/^data:image\/\w+;base64,/, '');
                    var buf = new Buffer(data, 'base64');
                    fs.writeFile(filename, buf, function(err) {
                        if (err) {
                            console.log('error');
                        }
                    });
                    this.value = '';
                });
            }, false);
            chooser.click();
        }

        if (typeof process === 'object') { // nodewebkit detection
            chooseFile('#fileDialogPDF');
        } else {
            var cfse = window.chooseFileSystemEntries;
            if (cfse !== undefined) {
                // PWA: https://web.dev/native-file-system/#write-file
                cfse({
                    type: 'saveFile',
                    accepts: [{
                        description: 'PDF file',
                        extensions: ['pdf'],
                        mimeType: ['application/pdf']
                    }]
                }).then(function (fh) {
                    fh.createWriter().then(function (writer) {
                        pdfdata(function (uri) {
                            writer.write(0, convertDataURIToBinary(uri))
                                .then(function () {
                                    writer.close();
                                });
                        });
                    });
                });
            } else {
                a = document.createElement('a');
                pdfdata(function (res) {
                    a.href = res;
                    a.download = 'wavedrom.pdf';
                    var theEvent = document.createEvent('MouseEvent');
                    theEvent.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    a.dispatchEvent(theEvent);
                    // a.click();
                });
            }
        }
    }

    function setPreferences() {
        let setPrefsInit = true ;
        const prefsDialog = document.getElementById("WaveDromEditorPrefs");
        
        let optDLSVGCbox = document.getElementById("optimizeSVGCbox");
        let inclWaveJSCbox = document.getElementById("includeWaveJSCbox");

        let slider = document.getElementById("pngexpqual");
        document.getElementById("pngexpqual").onchange = modifyPngExpQualOutput ;

        optDLSVGCbox.checked = optimizeSVGForDownload ;
        inclWaveJSCbox.checked = includeWaveJSInMetadata ;

        slider.value = pngscalef ;
        slider.dispatchEvent(new Event('change')); //  modifyPngExpQualOutput();

        document.getElementById("SVG").style['filter'] = 'blur(5px)' ;
        document.getElementById("TXT").style['filter'] = 'blur(5px)' ;
        prefsDialog.style.display = "block";
        setPrefsInit = false ;
        // Need options for:
        // -> Optimize Downloaded SVG (checked by default)
        // -> Include WaveJS in SVG Metadata (checked by default)
        // -> Select Layout (TBD)
        // -> SVG Pane Size (%) (TBD) // Better to be replaced by dragbar div between SVG and TXT
        document.getElementById("closeSettings").addEventListener("click", function () {
            prefsDialog.style.display = "none";
            pngscalef = slider.value ;

            optimizeSVGForDownload  = optDLSVGCbox.checked ;
            includeWaveJSInMetadata = inclWaveJSCbox.checked ;
            document.getElementById("SVG").style['filter'] = '' ;
            document.getElementById("TXT").style['filter'] = '' ;
        });

        function modifyPngExpQualOutput (e) {
            var width, newPoint, newPlace, offset, siblings, outputTag;
            width    = setPrefsInit ? 129 : this.offsetWidth;
            newPoint = (this.value - this.getAttribute("min")) / (this.getAttribute("max") - this.getAttribute("min"));
            offset   = 0;
            if (newPoint < 0) { newPlace = 0;  }
            else if (newPoint > 1) { newPlace = width; }
            else { newPlace = width * newPoint + offset; offset -= newPoint;}
            siblings = this.parentNode.childNodes;
            for (var i = 0; i < siblings.length; i++) {
            	var sibling = siblings[i];
                if (sibling.nodeName === "OUTPUT") {
                    if (sibling.attributes.for.value === this.id) {
            		    outputTag = sibling;
                    }
            	}
            }
            outputTag.style.left       = newPlace + "px";
            outputTag.style.marginLeft = offset + "%";
            outputTag.innerHTML        = this.value;
        }
    }

	
    WaveDrom.editorInit = editorInit;
    WaveDrom.menuOpen = menuOpen;
    WaveDrom.handleSubMenu = handleSubMenu ;
    WaveDrom.loadJSON = loadJSON;
    WaveDrom.saveJSON = saveJSON;
    WaveDrom.loadSVG = loadSVG;
    WaveDrom.saveSVG = saveSVG;
    WaveDrom.savePNG = savePNG;
    WaveDrom.savePDF = savePDF;
    WaveDrom.editorState = editorState;
    WaveDrom.setFullURL = setFullURL;
    WaveDrom.setPreferences = setPreferences ;
    WaveDrom.gotoWaveDromGuide = gotoWaveDromGuide;
    WaveDrom.gotoWaveDromHome = gotoWaveDromHome;

})();

/* eslint-env node, browser */
/* global WaveDrom */
/* eslint no-console: 1 */
