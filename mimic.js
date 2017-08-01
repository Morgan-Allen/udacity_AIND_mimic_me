// Mimic Me!
// Fun game where you need to express emojis being displayed

// --- Affectiva setup ---

// The affdex SDK Needs to create video and canvas elements in the DOM
var divRoot = $("#camera")[0]  // div node where we want to add these elements
var width = 640, height = 480  // camera image size
var faceMode = affdex.FaceDetectorMode.LARGE_FACES  // face mode parameter

// Initialize an Affectiva CameraDetector object
var detector = new affdex.CameraDetector(divRoot, width, height, faceMode)

// Enable detection of all Expressions, Emotions and Emojis classifiers.
detector.detectAllEmotions()
detector.detectAllExpressions()
detector.detectAllEmojis()
detector.detectAllAppearance()

// --- Utility values and functions ---

// Unicode values for all emojis Affectiva can detect
var emojis = [ 128528, 9786, 128515, 128524, 128527, 128521, 128535, 128539, 128540, 128542, 128545, 128563, 128561 ]

// Update target emoji being displayed by supplying a unicode value
function setTargetEmoji(code) {
  $("#target").html("&#" + code + "")
}

// Convert a special character to its unicode value (can be 1 or 2 units long)
function toUnicode(c) {
  if (c.length == 1) return c.charCodeAt(0)
  return ((((c.charCodeAt(0) - 0xD800) * 0x400) + (c.charCodeAt(1) - 0xDC00) + 0x10000))
}

// Update score being displayed
function setScore(correct, total) {
  $("#score").html("Score: " + correct + " / " + total)
}

// Display log messages and tracking results
function log(node_name, msg) {
  $(node_name).append("<span>" + msg + "</span><br />")
}

// --- Callback functions ---

// Start button
function onStart() {
  if (detector && !detector.isRunning) {
    $("#logs").html("")  // clear out previous log
    detector.start()  // start detector
  }
  log('#logs', "Start button pressed")
}

// Stop button
function onStop() {
  log('#logs', "Stop button pressed")
  if (detector && detector.isRunning) {
    detector.removeEventListener()
    detector.stop()  // stop detector
  }
}

// Reset button
function onReset() {
  log('#logs', "Reset button pressed")
  if (detector && detector.isRunning) {
    detector.reset()
  }
  $('#results').html("")  // clear out results
  $("#logs").html("")  // clear out previous log
  //
  // Reset game functionality
  resetGame()
}

// Add a callback to notify when camera access is allowed
detector.addEventListener("onWebcamConnectSuccess", function() {
  log('#logs', "Webcam access allowed")
})

// Add a callback to notify when camera access is denied
detector.addEventListener("onWebcamConnectFailure", function() {
  log('#logs', "webcam denied")
  console.log("Webcam access denied")
})

// Add a callback to notify when detector is stopped
detector.addEventListener("onStopSuccess", function() {
  log('#logs', "The detector reports stopped")
  $("#results").html("")
})

// Add a callback to notify when the detector is initialized and ready for running
detector.addEventListener("onInitializeSuccess", function() {
  log('#logs', "The detector reports initialized")
  //Display canvas instead of video feed because we want to draw the feature points on it
  $("#face_video_canvas").css("display", "block")
  $("#face_video").css("display", "none")
  //
  // Reset game functionality
  resetGame()
})


// Add a callback to receive the results from processing an image
// NOTE: The faces object contains a list of the faces detected in the image,
//   probabilities for different expressions, emotions and appearance metrics
detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
  var canvas = $('#face_video_canvas')[0]
  if (! canvas) return
  //
  // Report how many faces were found
  $('#results').html("")
  log('#results', "Timestamp: " + timestamp.toFixed(2))
  log('#results', "Number of faces found: " + faces.length)
  if (faces.length > 0) {
    //
    // Report desired metrics
    log('#results', "Appearance: " + JSON.stringify(faces[0].appearance))
    log('#results', "Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val
    }))
    log('#results', "Expressions: " + JSON.stringify(faces[0].expressions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val
    }))
    log('#results', "Emoji: " + faces[0].emojis.dominantEmoji)
    //
    // Call functions to draw feature points and dominant emoji (for the first face only)
    drawFeaturePoints(canvas, image, faces[0])
    drawEmoji(canvas, image, faces[0])
    //
    // Update game functionality:
    updateGame(faces[0])
  }
})


// --- Custom functions ---

// Draw the detected facial feature points on the image
function drawFeaturePoints(canvas, img, face) {
  //
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d')
  //
  // Loop over each feature point in the face

  //
  //  TODO:  Connect the dots between specific lines!  And maybe overlay a
  //  polygon display.

  for (var id in face.featurePoints) {
    var featurePoint = face.featurePoints[id]
    ctx.beginPath()
    ctx.fillStyle = "#000000"
    ctx.rect(featurePoint.x, featurePoint.y, 5, 5)
    ctx.fill()
  }
}


// Draw the dominant emoji on the image
function drawEmoji(canvas, img, face) {
  //
  //  Obtain a 2D context object to draw on the canvas
  var ctx    = canvas.getContext('2d')
  var emoji  = face.emojis.dominantEmoji
  var anchor = face.featurePoints[0]
  ctx.font = '48px serif'
  ctx.fillText(emoji, anchor.x, anchor.y)
}



// NOTE:
// - Remember to call your update function from the "onImageResultsSuccess" event handler above
// - You can use setTargetEmoji() and setScore() functions to update the respective elements
// - You will have to pass in emojis as unicode values, e.g. setTargetEmoji(128578) for a simple smiley
// - Unicode values for all emojis recognized by Affectiva are provided above in the list 'emojis'
// - To check for a match, you can convert the dominant emoji to unicode using the toUnicode() function


var gameStarted   = false
var priorEmoji    = null
var currentEmoji  = null
var targetEmoji   = null
var correctScore  = 0
var totalAttempts = 0


function resetGame() {
  gameStarted   = true
  correctScore  = 0
  totalAttempts = 0
  priorEmoji    = null
  currentEmoji  = null
  pickNextEmoji()
}


function updateGame(face) {
  //
  //  If there's been no change of expression, we simply store the current
  //  emoji and return-
  priorEmoji   = currentEmoji
  currentEmoji = face.emojis.dominantEmoji
  if (currentEmoji == priorEmoji) return
  //
  //  If there's been a change of expression, check to see if it matches the
  //  target emoji, and increment score accordingly.
  if (toUnicode(currentEmoji) == targetEmoji) {
    pickNextEmoji()
    correctScore += 1
  }
  totalAttempts += 1
  setScore(correctScore, totalAttempts)
}


function pickNextEmoji() {
  var index = Math.random() * emojis.length
  targetEmoji = emojis[Math.round(index)]
  setTargetEmoji(targetEmoji)
}










//
