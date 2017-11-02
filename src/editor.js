const CANVAS_OBJECT_TYPE = {
    PICTURE: 'PICTURE',
    TEXT: 'TEXT'
};
class CanvasEditor {
    constructor() {
        this.canvasObjects = [];
        this.selectedCanvasObject = null;
        this.listImage = document.getElementById('listImage');
        this.canvas = document.getElementById('canvas');
        this.formUpload = document.getElementById('formUpload');
        // form upload event
        this.formUpload.onsubmit = (event) => {
            this.formUploadSubmit(event);
        };
        // call api
        this.getAllImages();
        // bind area events
        this.bindEventsToCanvasArea();
        // bind add text events
        this.bindAddTextAction();
        // load canvasObjects from local storage
        const ls = localStorage.getItem('canvasObjects');
        if (ls) {
            const objs = JSON.parse(ls);
            objs.forEach((obj) => {
                this.addObjectToCanvas(obj, false);
            });
        }
        // auto save every 2s
        setInterval(() => {
            localStorage.setItem('canvasObjects', JSON.stringify(this.canvasObjects));
        }, 2000);
    }
    /**
     * bind event to add text button
     */
    bindAddTextAction() {
        const btnAddText = document.getElementById('addText');
        btnAddText.onclick = () => {
            const text = prompt('Enter your text', 'Lorem ipsum...');
            if (text) {
                const obj = {
                    uid: this.uid(),
                    type: CANVAS_OBJECT_TYPE.TEXT,
                    content: text,
                    position: {
                        left: 0,
                        top: 0
                    }
                };
                this.addObjectToCanvas(obj);
            }
        };
    }
    /**
     * bind events to canvas area
     */
    bindEventsToCanvasArea() {
        this.canvas.onclick = (event) => {
            if (event.target === this.canvas) {
                const selectedDomObject = this.canvas.querySelector('.selected');
                if (selectedDomObject) {
                    selectedDomObject.classList.remove('selected');
                    selectedDomObject.classList.remove('moving');
                    this.selectedCanvasObject = null;
                }
            }
        };
        this.canvas.onmousemove = (event) => {
            const div = this.canvas.querySelector('.moving');
            if (div) {
                const x = event.clientX;
                const y = event.clientY;
                const spaceX = x - parseInt(div.dataset.originalMouseX, 10);
                const spaceY = y - parseInt(div.dataset.originalMouseY, 10);
                const newLeft = parseInt(div.dataset.originalLeft, 10) + spaceX;
                const newTop = parseInt(div.dataset.originalTop, 10) + spaceY;
                div.style.left = `${newLeft}px`;
                div.style.top = `${newTop}px`;
                const obj = this.canvasObjects.filter((obj) => obj.uid === this.selectedCanvasObject)[0];
                obj.position = {
                    left: newLeft,
                    top: newTop
                };
            }
        };
        this.canvas.onmouseup = (event) => {
            const div = this.canvas.querySelector('.moving');
            if (div) {
                div.classList.remove('moving');
            }
        };
        // on press DELETE
        document.body.onkeyup = (event) => {
            if (event.keyCode === 46 && this.selectedCanvasObject !== null) {
                // remove obj from array of objects in canvas
                const obj = this.canvasObjects.filter((obj) => obj.uid === this.selectedCanvasObject)[0];
                this.canvasObjects.splice(this.canvasObjects.indexOf(obj), 1);
                this.selectedCanvasObject = null;
                // remove dom
                const dom = this.canvas.querySelector('.selected');
                dom.remove();
            }
        };
    }
    /**
     * submit form upload to /upload endpoint
     * @param event
     * @returns {boolean}
     */
    formUploadSubmit(event) {
        event.preventDefault();
        const fileUploadInput = this.formUpload.querySelector('#fileUpload');
        if (fileUploadInput.files.length) {
            const formData = new FormData();
            const file = fileUploadInput.files[0];
            if (!file.type.match(/image\/*/)) {
                alert('You have to select image file type!');
            }
            else {
                formData.append('upload', file);
                // upload
                $.ajax({
                    url: `//${location.host}/uploads`,
                    data: formData,
                    type: 'POST',
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: (data) => {
                        console.log(data);
                        // append to list view
                        this.appendImageToList(data.file);
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        console.error(jqXHR, textStatus, errorThrown);
                        alert(jqXHR.responseJSON.message.code);
                    }
                });
            }
        }
        else {
            alert('You have to select a picture from your local machine!');
        }
        return false;
    }
    /**
     * append an image src to list view
     * @param imgSrc
     */
    appendImageToList(imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.classList.add('img-rounded');
        const li = document.createElement('li');
        li.appendChild(img);
        this.listImage.appendChild(li);
        img.onclick = () => {
            const obj = {
                uid: this.uid(),
                type: CANVAS_OBJECT_TYPE.PICTURE,
                content: imgSrc,
                position: {
                    left: 0,
                    top: 0
                }
            };
            this.addObjectToCanvas(obj);
        };
    }
    /**
     * get all images
     */
    getAllImages() {
        $.ajax({
            url: `//${location.host}/images`,
            type: 'GET',
            dataType: 'json',
            success: (data) => {
                this.listImage.innerHTML = '';
                data.forEach((imgSrc) => {
                    this.appendImageToList(imgSrc);
                });
            }
        });
    }
    /**
     * generate dynamic uid
     * @returns {string}
     */
    uid() {
        const S4 = function () {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
    }
    /**
     * add object to canvas
     * @param obj
     * @param reposition
     */
    addObjectToCanvas(obj, reposition = true) {
        this.canvasObjects.push(obj);
        let divWillBeAdd;
        if (obj.type == CANVAS_OBJECT_TYPE.PICTURE) {
            divWillBeAdd = this.addPictureToCanvas(obj);
        }
        else if (obj.type === CANVAS_OBJECT_TYPE.TEXT) {
            divWillBeAdd = this.addTextToCanvas(obj);
        }
        if (reposition === true) {
            const centerPos = this.calculateCenterPosition(divWillBeAdd);
            obj.position = centerPos;
        }
    }
    createDivWrapper(obj) {
        // make a div to wrap main object
        const div = document.createElement('div');
        div.id = obj.uid;
        div.className = 'item';
        div.style.left = `${obj.position.left}px`;
        div.style.top = `${obj.position.top}px`;
        return div;
    }
    /**
     * convert an ICanvasObject <IMAGE> to HTMLElement and append to canvas area
     * @param obj
     */
    addPictureToCanvas(obj) {
        // make a div to wrap main object
        const div = this.createDivWrapper(obj);
        const img = document.createElement('img');
        img.src = obj.content;
        div.appendChild(img);
        this.canvas.appendChild(div);
        // bind events;
        this.bindEventToCanvasObject(div);
        return div;
    }
    /**
     * convert an ICanvasObject <TEXT> to HTMLElement and append to canvas area
     * @param obj
     */
    addTextToCanvas(obj) {
        // make a div to wrap main object
        const div = this.createDivWrapper(obj);
        const span = document.createElement('span');
        span.innerText = obj.content;
        span.style.fontSize = '20px';
        div.appendChild(span);
        this.canvas.appendChild(div);
        // bind events;
        this.bindEventToCanvasObject(div);
        return div;
    }
    /**
     * bind events to canvas object
     * @param div
     */
    bindEventToCanvasObject(div) {
        // on clicking dom, add class `selected` to DOM
        div.onclick = () => {
            // deselect current selected dom
            const preSelectedDom = this.canvas.querySelector('.selected');
            if (preSelectedDom && preSelectedDom !== div) {
                preSelectedDom.classList.remove('selected');
                this.selectedCanvasObject = null;
            }
            div.classList.add('selected');
            this.selectedCanvasObject = div.id;
        };
        div.onmousedown = (event) => {
            div.click();
            if (div.classList.contains('selected')) {
                div.classList.add('moving');
                const styles = window.getComputedStyle(div);
                div.dataset.originalLeft = styles.left;
                div.dataset.originalTop = styles.top;
                div.dataset.originalMouseX = event.clientX + '';
                div.dataset.originalMouseY = event.clientY + '';
            }
        };
        for (let i = 0; i < div.children.length; i++) {
            const childEle = div.children.item(i);
            childEle.onclick = (event) => false;
            childEle.onmousedown = (event) => false;
            childEle.onmousemove = (event) => false;
            childEle.onmouseup = (event) => false;
        }
    }
    /**
     * set dom to center position and return position { left, top }
     * @param div
     * @returns {{left: number, top: number}}
     */
    calculateCenterPosition(div) {
        // get canvas size
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        // get element size
        const elementWidth = div.clientWidth;
        const elementHeight = div.clientHeight;
        const left = (canvasWidth - elementWidth) / 2;
        const top = (canvasHeight - elementHeight) / 2;
        div.style.left = `${left}px`;
        div.style.top = `${top}px`;
        return {
            left, top
        };
    }
    /**
     * I want to log things I want to know
     */
    debug() {
        console.log('CANVAS OBJS', this.canvasObjects);
        console.log('SELECTED OBJ', this.selectedCanvasObject);
    }
}
//# sourceMappingURL=editor.js.map