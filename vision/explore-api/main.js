// Copyright 2015, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

var CV_URL = 'https://vision.googleapis.com/v1/images:annotate?key=' + window.apiKey;

var interval;

$(function () {
  // Grab elements, create settings, etc.
  var video = document.getElementById('video');

  // Get access to the camera!
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Not adding `{ audio: true }` since we only want video now
      navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
          video.src = window.URL.createObjectURL(stream);
          video.play();
      });
  }
  $('#fileform').on('submit', uploadFiles);
  $('#snap').on('click', takeSnapshot);
  $('#start').on('click', start);
  $('#stop').on('click', stop);
});

function start(event){
  interval = setInterval(function(){
    takeSnapshot();
  }, 2000)
}
function stop(event){
  clearInterval(interval);
}

function takeSnapshot (event) {
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  context.drawImage(video, 0, 0, 640, 480);
  var image = new Image();
	image.src = canvas.toDataURL("image/jpeg");
  sendFileToCloudVision(image.src.replace('data:image/jpeg;base64,', ''));
}

/**
 * 'submit' event handler - reads the image bytes and sends it to the Cloud
 * Vision API.
 */
function uploadFiles (event) {
  event.preventDefault(); // Prevent the default form post

  // Grab the file and asynchronously convert to base64.
  var file = $('#fileform [name=fileField]')[0].files[0];
  var reader = new FileReader();
  reader.onloadend = processFile;
  reader.readAsDataURL(file);
}

/**
 * Event handler for a file's data url - extract the image data and pass it off.
 */
function processFile (event) {
  var content = event.target.result;
  sendFileToCloudVision(content.replace('data:image/jpeg;base64,', ''));
}

/**
 * Sends the given file contents to the Cloud Vision API and outputs the
 * results.
 */
function sendFileToCloudVision (content) {
  // var type = $('#fileform [name=type]').val();
  var type = 'FACE_DETECTION';

  // Strip out the file prefix when you convert to json.
  var request = {
    requests: [{
      image: {
        content: content
      },
      features: [{
        type: type,
        maxResults: 200
      }]
    }]
  };

  $('#results').text('Loading...');
  $.post({
    url: CV_URL,
    data: JSON.stringify(request),
    contentType: 'application/json'
  }).fail(function (jqXHR, textStatus, errorThrown) {
    $('#results').text('ERRORS: ' + textStatus + ' ' + errorThrown);
  }).done(highlightFace).done(displayJSON);
}

/**
 * Displays the results.
 */
function displayJSON (data) {
  var contents = JSON.stringify(data, null, 4);
  $('#results').text(contents);
  var evt = new Event('results-displayed');
  evt.results = contents;
  document.dispatchEvent(evt);
  highlightFace(data);
}

function highlightFace(data) {
   var canvas = document.getElementById('canvas');
   var context = canvas.getContext('2d');

   // Now draw boxes around all the faces
   context.strokeStyle = 'rgba(0,255,0,0.8)';
   context.lineWidth = '1';

   context.beginPath();
   data.responses[0].faceAnnotations.forEach(function (face) {
     var verts = face.boundingPoly.vertices;
     context.moveTo(verts[0].x, verts[0].y)
     context.lineTo(verts[1].x, verts[1].y)
     context.lineTo(verts[2].x, verts[2].y)
     context.lineTo(verts[3].x, verts[3].y)
     context.lineTo(verts[0].x, verts[0].y)

     var verts = face.fdBoundingPoly.vertices;
     context.moveTo(verts[0].x, verts[0].y)
     context.lineTo(verts[1].x, verts[1].y)
     context.lineTo(verts[2].x, verts[2].y)
     context.lineTo(verts[3].x, verts[3].y)
     context.lineTo(verts[0].x, verts[0].y)

     face.landmarks.forEach(function(landmark){
        var x = landmark.position.x;
        var y = landmark.position.y;
        var s = 3
        context.rect(x-s,y-s,s,s);
        context.stroke();
     });
   });
   context.stroke();
   var dataURL = canvas.toDataURL();
   canvas.src = dataURL;
   createChart(data.responses[0].faceAnnotations[0]);
  //  document.getElementById('joy').innerHTML = data.responses[0].faceAnnotations[0].joyLikelihood;
  //  document.getElementById('sorrow').innerHTML = data.responses[0].faceAnnotations[0].sorrowLikelihood;
  //  document.getElementById('anger').innerHTML = data.responses[0].faceAnnotations[0].angerLikelihood;
  //  document.getElementById('surprise').innerHTML = data.responses[0].faceAnnotations[0].surpriseLikelihood;

}

function probToInt(emotion){
  if(emotion === 'UNKNOWN'){
    return 0
  } else if (emotion === "VERY_UNLIKELY"){
  return 1
  } else if (emotion === "UNLIKELY"){
  return 2
  } else if (emotion === "POSSIBLE"){
   return 3
 } else if (emotion === "LIKELY"){
   return 4
 } else if (emotion === "VERY_LIKELY"){
   return 5
 }
 }

function createChart(data){
  var data = {
  // A labels array that can contain any sort of values
  labels: ['Joy', 'Sorrow', 'Anger', 'Surprise'],
  // Our series array that contains series objects or in this case series data arrays
  series: [
    [ probToInt(data.joyLikelihood),
      probToInt(data.sorrowLikelihood),
      probToInt(data.angerLikelihood),
      probToInt(data.surpriseLikelihood)]
    ]
  };
  new Chartist.Bar('.ct-chart', data);
}
