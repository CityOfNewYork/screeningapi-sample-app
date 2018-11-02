var formValues = {}
var token
var filename = 'response.csv'

function setErrors(messageString, errorState) {
    var ele = document.getElementById('errors');
        ele.innerHTML = '<ul>' + messageString + '</ul>';
        ele.style.display = errorState;
}

function setToken(responseText) {
    try {
        token = JSON.parse(responseText).token
    }
    catch (err) {}
}

function sendPostRequest(url, headersObject, responseHandler, requestPayload) {
    setErrors('', 'none')
    document.getElementById('loader').className = 'showText'
    var req = new XMLHttpRequest();
    req.open('POST', url, true);
    Object.keys(headersObject).forEach(function(key) {
        req.setRequestHeader(key, headersObject[key]);
    });
    req.onreadystatechange = function() {
        document.getElementById('loader').className = 'hideText'
        responseHandler(req)
    }
    req.send(requestPayload)
}

function displayErrors(responseText, showPath) {
    var errorJSON
    var errorsArray = []
    try {
        errorJSON = JSON.parse(responseText).errors
        errorsArray = errorJSON.map(function(error) {
            const { elementPath, message } = error
            const errorMsg = elementPath && showPath ? message + ' Element Path: ' + elementPath + '.' : message
            return '<li>' + errorMsg + '</li>'
        })
    }
    catch (err) {}
    setErrors(errorsArray.join(''), 'block');
}

function bulkSubmissionHandler(req) {
    if (req.readyState === 4) {
        const status = req.status.toString()
        if (status.startsWith('4') || status.startsWith('5')) {
            displayErrors(req.responseText, true)
        }
        else if (status.startsWith('2')) {
            const blob = new Blob([req.response], {type : 'text/csv'})
            if (typeof window.navigator.msSaveBlob !== 'undefined') {
                window.navigator.msSaveBlob(blob, filename)
            }
            else {
                const URL = window.URL || window.webkitURL
                const downloadUrl = URL.createObjectURL(blob)

                const a = document.createElement('a')
                if (typeof a.download === 'undefined') {
                    window.location = downloadUrl
                }
                else {
                    a.href = downloadUrl
                    a.download = filename
                    document.body.appendChild(a)
                    a.click()
                }
                setTimeout(() => {
                URL.revokeObjectURL(downloadUrl)
                }, 100) // cleanup
            }
        }
    }
}

function sendBulkSubmissionRequest() {
    const { baseurl, username, csvFile } = formValues
    var url = baseurl + 'bulkSubmission/import'
    if (formValues.programs) {
        var programs = formValues.programs.split(',').join('|')
        url = url + '?interestedPrograms=' + programs
    }
    var headersObject = {
        username, Authorization : token,
    }
    var formData = new FormData();
    formData.append("file", csvFile);
    sendPostRequest(url, headersObject, bulkSubmissionHandler, formData)
}

function authResponseHandler(req) {
    if(req.readyState === 4) {
        const status = req.status.toString()
        if (status.startsWith('4') || status.startsWith('5')) {
            displayErrors(req.responseText, false)
        }
        else if (status.startsWith('2')) {
            setToken(req.responseText)
            sendBulkSubmissionRequest()
        }
    }
}

document.querySelector('form').addEventListener('submit',function (e) {
    e.preventDefault()
    const formData = new FormData(e.target);
    for (var [key, value] of formData.entries()) {
        formValues[key] = value
    }
    const { baseurl, username, password, newPassword } = formValues
    console.log('programs', formValues.programs)
    var url = baseurl + 'authToken'
    var headersObject = {
        'Content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    }
    const authPayload = { username, password }
    if (newPassword) {
        authPayload.newPassword = newPassword
    }
    sendPostRequest(url, headersObject, authResponseHandler, JSON.stringify(authPayload))
});