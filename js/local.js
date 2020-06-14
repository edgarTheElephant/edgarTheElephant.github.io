/********************************************************************************/
/*
  A note on audio

  By way of summary of how things are _supposed_ to work with sound and
  animation turned on ...

  The elephant on the front screen shrinks, along with a shrinking sound.  The
  title bar of the second screen then appears successively, with a popping
  sound against each element, followed by 'ta-da', and then the main body of
  the page appears.  On the main body, a mouseover event on each tile causes
  a sound-effect to be played.

  This works fine on Windows (or at least, it does in Chrome and Firefox,
  which are the only two I've tried).

  It also works on Android (except that I've had to disable the mouseover
  proceassing, because on tablets and mobiles there is no direct equivalent
  of mouseover; if not disabled, mouseclick is taken as being the same thing,
  and then the sound effects become intrusive).

  And then we came to iPhone ...

  The original implementation involved placing three audio tags in the HTML
  (elephant-shrink, pop and ta-da), and then playing them under Javascript
  control, with each new stage in the animation being kicked off by the
  ending of the sound effect associated with the previous one.

  With this implementation, the shrink sound played ok, but after that things
  ground to a halt following the first stage of the animation, because no
  other sound was actually played, and therefore the completion of a sound
  could not be used to kick off the next stage.

  A website suggested this was pretty much par for the course (one of
  the issues being that apparently Apple (or certainly iPhone)
  disables spontaneous playing of sounds to avoid users having to pay
  for the bandwidth, relying upon users clicking things to indicate
  they're happy for the sound to be downloaded).

  The website suggested creating a Javascript audio object in response to
  an initial button-click (in our case, in response to clicking on one of
  the buttons on the front screen), and then setting the source of this
  as appropriate each time and then using the play method.

  This worked, but was horrendously slow -- there appeared to be a huge
  amount of latency before each sound was played, and also sounds were
  not cached, so the pop sounds (which is used a lot) was downloaded
  each time it was needed.

  It then occurred to me that perhaps rather than create a Javascript
  Audio object, I could instead create an HTML audio tag (much like
  the original implementation, but this time creating the tag from
  code, rather than hard-coding it in the HTML).  This worked in so
  far as the animation now ran to completion, and the pop was downloaded
  only once.  However, the pop sound now only actually _sounded_ once.

  At this point, I gave up -- there seemed little point in introducing the
  extra complexity described above when it was either going to slow down
  the rendering singificantly, or else wasn't really going to work.  So
  instead, I now look for stuff running on Mac OS or iPhone and disable
  the sound processing.

  One other issue -- as mentioned above, there seems to be a lot of
  latency on downloading sounds on iPhone / Mac.  As things now stand,
  this is academic, because I'm not using any (other than elephant-shrink).
  However, one website suggested that for reasons no one can really fathom,
  adding the G_AudioContext details below fixed that.  I'm not sure either
  way, but it doesn't seem to have an adverse impact on anything else so
  far as I can see, so I've opted to include it in case I ever do find a
  way of handling sounds properly on iPhone.

  (It turns out that there is no reason to worry about special processing
  on Macbook; I am still to discover what iPad does.)
*/

/********************************************************************************/
var G_HaveTouchScreen = !window.matchMedia('(hover: hover)').matches;
var G_IsApple = -1 != navigator.appVersion.toLowerCase().indexOf("iphone") || -1 != navigator.appVersion.toLowerCase().indexOf("ipad") || -1 != navigator.appVersion.toLowerCase().indexOf("ipod");
var G_StoryAudio = null;
var G_WantAnimation = true;

const G_AudioContextClass = window.AudioContext || window.webkitAudioContext; // See head-of-file comments.
const G_AudioContext = new G_AudioContextClass();






/********************************************************************************/
/********************************************************************************/
/**                                                                            **/
/**                                  Start up                                  **/
/**                                                                            **/
/********************************************************************************/
/********************************************************************************/

/******************************************************************************/
/* There seems to be no easy (non-programming) way of ensuring that the content
   portion of the screen (ie the non-header, non-footer section) fills the gap
   between header and footer, so we need to set things up in code, both on
   startup and and susbequent changes to size and orientation. */

function initialise ()
{
    //var txt = "";
    //txt += "Browser CodeName: " + navigator.appCodeName + "; ";
    //txt += "Browser Name: " + navigator.appName + "; ";
    //txt += "Browser Version: " + navigator.appVersion + "; ";
    //txt += "Cookies Enabled: " + navigator.cookieEnabled + "; ";
    //txt += "Browser Language: " + navigator.language + "; ";
    //txt += "Browser Online: " + navigator.onLine + "; ";
    //txt += "Platform: " + navigator.platform + "; ";
    //txt += "User-agent header: " + navigator.userAgent + ".";
    alert(G_IsApple);
    
    if (G_HaveTouchScreen) $("#story-details-read-booklet").css("display", "none");
    // Deferred to doStart1, because we really want this only when
    // displaying the main screen.
    
    // window.onorientationchange = function() { setTimeout(resize, 100); }
    // window.onresize = function() { setTimeout(resize, 100); }
    // resize();
}


/********************************************************************************/
/* Called when the button on the splash screen is clicked. */

function doStart (wantAnimation)
{
    G_WantAnimation = wantAnimation;
    
    $("#splash-text").text("");
    if (G_WantAnimation)
    {
	$("#splash-image").addClass("shrink-to-nothing");
	document.getElementById("shrink").play();
	$("#splash-image").one("webkitAnimationEnd oanimationend oAnimationEnd msAnimationEnd animationend", function() { document.getElementById("welcome-modal").style.display="none"; setTimeout(doStart1, getTimeout(500)); });
    }
    else
    {
	document.getElementById("welcome-modal").style.display="none";
	doStart1();
    }
}


/********************************************************************************/
/* Kicks off the main display when the splash screen has finished. */

function doStart1 ()
{
    window.onorientationchange = function() { setTimeout(resize, 100); }
    window.onresize = function() { setTimeout(resize, 100); }
//    resize();
    runSequence();
}





/********************************************************************************/
/********************************************************************************/
/**                                                                            **/
/**                                 Sequencing                                 **/
/**                                                                            **/
/********************************************************************************/
/********************************************************************************/

/********************************************************************************/
/*
   Options are ...

     arrayFn AND audio: arrayFn is assumed to perform something on
       each element of some array.  It is called for each element of
       that array in turn, with the audio being played at the end of
       each step, and the next step starting when the audio is
       finished.  arrayFn must take a single argument -- the index
       into the array of items which selects the element it is to
       process on this call.

     oneOffFn: This is assumed to perform some processing about which
       we need to know nothing about this level (perhaps because it is
       a one-off which does not fit readily into the overall pattern).
       oneOffFn receives a single argument -- a function which it has
       to call when it has finished its processing.

     pause: This gives a delay in milliseconds which is introduced at
       this point.

     audio: This identifies an audio tag.  The tag is played, with further
       processing being delayed until it has finished.

     justDoIt: Probably wants to come at the end of the sequence, and is
       simply called.

     No other permutations are handled at present.
*/


var G_Sequence =
    [
	{arrayFn:displayElephant, audio:"pop"},
	{oneOffFn:displayTitle},
	{arrayFn:displayTitleFills, audio:"pop"},
	{justDoIt:resize},
	{pause:1000},
	{oneOffFn:displayAndOther},
	{audio:"ta-da"},
	{justDoIt:displayBottomOfScreen},
	{justDoIt:displayStories},
	{justDoIt:resize}
    ];



/********************************************************************************/
/* This operates in two significantly different ways, depending upon whether or
   not the user has asked for animation (which we take as also implying that
   sounds should be played.

   If there is no animation, we simply call the given function, if it is defined.

   If there is animation, and the function is defined, then we arrange for it
   to be called after we've finished playing the audio clip.

   Then, whether the function is defined or not, we play the clip. */

function doPlay (audio, fn)
{
    if (G_WantAnimation && null != audio)
    {
	if (null !== fn) audio.onended = fn;
	audio.play();
    }
    else
    {
	if (null !== fn) fn();
    }
}

    
/********************************************************************************/
/* Returns either the requested timeout, or zero if no animations have been
   requested. */

function getTimeout (proposedValue)
{
    return G_WantAnimation ? proposedValue : 0;
}


/******************************************************************************/
/* Gets the modified timeout period -- either the period which has been
   requested or zero if animation has been turned off.  If the result is
   zero, calls the given function immediately.  Otherwise makes it subject
   to a timeout. */

function doSetTimeout (period, fn)
{
    period = getTimeout(period);
    if (0 === period)
	fn();
    else
	setTimeout(fn, period);
}


/********************************************************************************/
function runElementWithAudio (fn, audio, ix, finishedFn)
{
    if (fn(ix))
	doPlay(audio, function () { runElementWithAudio(fn, audio, ix + 1, finishedFn); });
    else
	finishedFn();
}


/********************************************************************************/
function runElementWithoutAudio (fn, ix, finishedFn)
{
    if (fn(ix))
	doPlay(null, function () { runElementWithoutAudio(fn, ix + 1, finishedFn); });
    else
	finishedFn();
}


/********************************************************************************/
function runSequence (ix)
{
    runSequence1(0);
}


/********************************************************************************/
function runSequence1 (ix)
{
    /****************************************************************************/
    if (ix >= G_Sequence.length)
	return;


    
    /****************************************************************************/
    let promise = new Promise(function (resolve, reject)
			      {
				  var resolver = function () { resolve("Done"); };
				  var dummyFunctionForAudio = function (index, dummy) { return 0 == index; }
				  var element = G_Sequence[ix];

				  if (element.oneOffFn)
				      element.oneOffFn(resolver);

				  else if (element.pause)
				      doSetTimeout(element.pause, resolver);

				  else if (element.arrayFn && element.audio)
				  {
				      if (G_IsApple)
					  runElementWithoutAudio(element.arrayFn, 0, resolver);
				      else
					  runElementWithAudio(element.arrayFn, document.getElementById(element.audio), 0, resolver);
				  }
				  
				  else if (element.arrayFn)
				      runElementWithoutAudio(element.arrayFn, 0, resolver);
				  
				  else if (element.audio)
				  {
				      if (G_IsApple)
					  runElementWithoutAudio(dummyFunctionForAudio, 0, resolver);
				      else
					  runElementWithAudio(dummyFunctionForAudio, document.getElementById(element.audio), 0, resolver);
				  }

				  else if (element.justDoIt)
				  {
				      element.justDoIt();
				      resolver();
				  }
			      });

    var nextFn = function (x) { runSequence1(ix + 1); };
    promise.then(result => nextFn(result), error => alert(error));
}






/********************************************************************************/
/********************************************************************************/
/**                                                                            **/
/**                                  Display                                   **/
/**                                                                            **/
/********************************************************************************/
/********************************************************************************/

/********************************************************************************/
/********************************************************************************/
/********************************************************************************/
/********************************************************************************/
const C_ElephantElements =
    [
	"#elephant-outline",
	"#elephant-body",
	"#elephant-eye",
	"#elephant-toenail-1",
	"#elephant-toenail-2",
	"#elephant-tusk"
    ]


/********************************************************************************/
function displayElephant (ix)
{
    if (ix >= C_ElephantElements.length) return false;
    $(C_ElephantElements[ix]).show();
    return true;
}



/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
const C_Email_1 = "edgartheelephant";
const C_Email_2 = "critos";
const C_Email_3 = ".co.uk";
const C_Email   = `<a href="mailto:${C_Email_1}@${C_Email_2}${C_Email_3}">${C_Email_1}@${C_Email_2}${C_Email_3}</a>`;

const C_Advert  =
  `<div class="read-me-box" style="border:solid 1px black;padding:4px;background:dodgerBlue;font-weight:bold;color:yellow;display:flex;align-items:center">
     <div class="w3-container">
       <div class="w3-row">
         <div class="w3-rest">
           <br><img id="ad-picture-child-picture" src="./img/childsPainting.jpg" style="display:block;margin:0 auto;width:100px;box-shadow: 10px 10px 10px black;border:solid 2px black;"><br>
         </div>
       </div>

       <div class="w3-row">
         <div class="w3-rest">
           We&rsquo;d love to include your children&rsquo;s artwork in our Facebook gallery.  Send a picture of their artwork, along with their first name, to ${C_Email}, and
                                       get a personalised email from Edgar in return!

         </div>
       </div>
     </div>
   </div>

   <div class="read-me-box" style="border:solid 1px black;padding:4px;background:red;font-weight:bold;color:yellow;display:flex;align-items:center">
     <div class="w3-container">
       <div class="w3-row">
         <div class="w3-rest">
           <img id="ad-picture-child-star" src="./img/hero.png" style="display:block;margin:0 auto;width:200px;">
         </div>
       </div>

       <div class="w3-row">
         <div class="w3-rest">
           <p style="text-align:center;font-size:large">Make your child the star!</p>
                                         Why not let us send you an audio file of one of the stories here, tailored with the name of your child,
                                         so that they become the hero?  Just £5 per story.  Email us at ${C_Email}, giving the name of your child and
                                         the story title.</p>
</div>
         </div>
       </div>
     </div>
   </div>`;

const C_Stories = [
    { fileName:"readMeFirst",
      header:"Before you start",
      blurb:`<div class="read-me-box">
               <div class="read-me-title">Welcome!</div>
               <p>Gentle, timeless, calming stories for younger children.</p>

               <p>Each story is available as a professionally-voiced
                  MP3 file which you can listen to online or download.
                  Each also comes with a downloadable activity sheet
                  which contains the text of the story (so you can
                  read it to your child yourself if you prefer), some
                  things your child can do on their own, and some you
                  can do with them.</p>

               <p>We aim to continue adding new material, so make sure you visit this site regularly!</p>
             </div>

             ${C_Advert}

             <div class="read-me-box">
               <div class="read-me-title">Do I have to pay to use the things here?</div>
               <p>No &mdash; these stories, audios and pictures are available free of charge.  If you&rsquo;d
                  like to make a donation, though, we certainly won&rsquo;t say no!
                  (Click on the &lsquo;Donate&rsquo; button in the footer of this page).<p>
             </div>



             <div class="read-me-box">
               <div class="read-me-title">Downloading</div>
               <p>Click on a tile on this webpage to see the details for that story.  This lets you download or listen to the audio book,
                  and download or read online the associated activity booklet.</p>
               <p>Alternatively, click the links below to listen to all of the audio files online, or to download a zip file containing
                  all of the activity booklets.</p>

  	       <div style="text-align:center">
                 <a          class="w3-btn w3-green" target="_blank" rel="noopener noreferrer" href="https://www.breaker.audio/edgar-the-elephant-and-other-stories"><i class="fa fa-headphones"></i> Audio</a>&nbsp;
	         <a download class="w3-btn w3-green" target="_blank" rel="noopener noreferrer" href="resources/readMe/edgarTheElephantAndOtherStories_2020_06_13.zip">
                  <i class="fa fa-download"></i> <i class="fas fa-book-reader"></i> Booklets
                 </a><br>
              </div>
            </div>



             <div class="read-me-box">
               <div class="read-me-title">Contact us</div>
               <p>You can contact us at ${C_Email}.  Also find us on Facebook: <a href="https://www.facebook.com/EdgarAndStories/" target="_blank" rel="noopener noreferrer"><i class="fab fa-facebook-square" aria-hidden="true" style="font-size:x-large;" title="Facebook"></i></a>&nbsp;&nbsp; and Instagram: <a href="https://www.instagram.com/edgar_and_stories/" target="_blank" rel="noopener noreferrer"><i class="fab fa-instagram" aria-hidden="true" style="font-size:x-large" title="Instagram"></i></a>.</p>
             </div>


             <div class="read-me-box" style="font-size:xx-small;font-weight:bold">
             <div style="text-align:center;text-decoration:underline;font-weight:bold">Copyright</div>
             <p>Stories are &copy; ARA Jamieson 2020.  Audio versions are &copy; <a href="http://www.christopherjamieson.co.uk">CT Jamieson</a> 2020.
                The music which forms part of the audio books is &copy; <a href="http://www.racheljamieson.com">RA Jamieson</a>.
                Some of the colouring-in pictures in the activity sheets are &copy; <a href="http://www.etsy.com/uk/shop/LittlePaperTrails">Samantha Purkis 2020</a>.</p>


               <p><span style="font-size:medium"><i class="fab fa-creative-commons" aria-hidden="true"></i>
                  <i class="fab fa-creative-commons-by" aria-hidden="true"></i>
                  <i class="fab fa-creative-commons-nc" aria-hidden="true"></i>
                  <i class="fab fa-creative-commons-nd" aria-hidden="true"></i> </span>
                  This work is licensed under CC BY-NC-ND 4.0. To view a copy of this licence, visit
                  <a rel="noopener,noreferrer" href="https://creativecommons.org/licenses/by-nc-nd/4.0" target="_blank">https://creativecommons.org/licenses/by-nc-nd/4.0</a>.
                  In essence, this permits you to pass the various files on to other people if you wish, but you must not alter them, you must not use them commercially,
                  and you must not charge for them.  The licence also requires you to give an attribution for anything you pass on to other people.  However, all of the
                   material contains attributions, so there is nothing you need to do in that respect.</p><br><br>

               <div style="text-align:center;text-decoration:underline;font-weight:bold">With thanks</div>
               <p>I should like to acknowledge my gratitude to all of the following :-</p>
               <div style="padding-left:3em">
                 Shrinking elephant sound: Audio Assets by Chris Butler.<br style="padding-bottom:0.5em">
                 Aeroplane: By <a rel="noopener noreferrer" target="_blank" href="https://freesound.org/people/mattew/">Mattew</a>.
                               <a rel="noopener noreferrer" target="_blank" href="https://creativecommons.org/licenses/by/3.0/">Creative Commons Licence Attribution 3.0 Unported (CC BY 3.0)</a>.<br style="padding-bottom:0.5em">
                 Blackbird boing: <a rel="noopener,noreferrer" href='http://www.tunepocket.com' target='_blank'>TunePocket</a><br style="padding-bottom:0.5em">
                 Sombrero: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Clker-Free-Vector-Images-3736/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=26735">Clker-Free-Vector-Images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=26735">Pixabay</a><br style="padding-bottom:0.5em">
                 Elephant (stylised): Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Clker-Free-Vector-Images-3736/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=305080">Clker-Free-Vector-Images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=305080">Pixabay</a><br style="padding-bottom:0.5em">
                 Bucket and sponge: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Clker-Free-Vector-Images-3736/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=309439">Clker-Free-Vector-Images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=309439">Pixabay</a><br style="padding-bottom:0.5em">
                 Sweetcorn: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Clker-Free-Vector-Images-3736/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=40294">Clker-Free-Vector-Images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=40294">Pixabay</a><br style="padding-bottom:0.5em">
                 Crown: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Clker-Free-Vector-Images-3736/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=40857">Clker-Free-Vector-Images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=40857">Pixabay</a><br style="padding-bottom:0.5em">
                 Reindeer: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Clker-Free-Vector-Images-3736/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=41462">Clker-Free-Vector-Images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=41462">Pixabay</a><br style="padding-bottom:0.5em">
                 Easter egg: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Clker-Free-Vector-Images-3736/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=48760">Clker-Free-Vector-Images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=48760">Pixabay</a><br style="padding-bottom:0.5em">
                 Tee shirt: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/Johanna84-31220/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=181707">Johanna Pakkala</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=181707">Pixabay</a><br style="padding-bottom:0.5em">
                 Flower: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/k-images-3402423/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1969921">k-images</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1969921">Pixabay</a><br style="padding-bottom:0.5em">
                 Cute elephant: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/one_life-2901127/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1540930">one_life</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=1540930">Pixabay</a><br style="padding-bottom:0.5em">
                 Carrot: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/OpenClipart-Vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=145036">OpenClipart-Vectors</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=145036">Pixabay</a><br style="padding-bottom:0.5em">
                 Ladder: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/OpenClipart-Vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=145193">OpenClipart-Vectors</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=145193">Pixabay</a><br style="padding-bottom:0.5em">
                 Parachute: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/OpenClipart-Vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=151230">OpenClipart-Vectors</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=151230">Pixabay</a><br style="padding-bottom:0.5em">
                 Grandmother: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/OpenClipart-Vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=153657">OpenClipart-Vectors</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=153657">Pixabay</a><br style="padding-bottom:0.5em">
                 Paper: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/OpenClipart-Vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=154169">OpenClipart-Vectors</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=154169">Pixabay</a><br style="padding-bottom:0.5em">
                 Blackbird: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/OpenClipart-Vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=154654">OpenClipart-Vectors</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=154654">Pixabay</a><br style="padding-bottom:0.5em">
                 Sun: Image by <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/users/OpenClipart-Vectors-30363/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=161923">OpenClipart-Vectors</a> from <a rel="noopener noreferrer" target="_blank" href="https://pixabay.com/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=161923">Pixabay</a>
            </div>
          </div>`,
      mouseOverSound: null,
      infoOnly: true
    },
    
//    { fileName:"pedroAndTheWaterMelon",
//      header:"Pedro and the Water Melon",
//      blurb:`Pedro and his brothers and sisters need new clothes. But their mummy doesn&rsquo;t have enough money. Then Pedro has an idea. A very good idea indeed.`,
//      mouseOverSound:"pedro.mp3",
//      recommendedVolume:1
//    },
//    
//    { fileName:"sarahAndTheRobbers",
//      header:"Sarah and the Robbers",
//      blurb:`Robbers are stealing all the farmers&rsquo; sweetcorn. Will Sarah be able to come to the rescue?`,
//      mouseOverSound:"sarahAndTheRobbers.mp3",
//      recommendedVolume:1
//    },
//    
    { fileName:"greatFatherChristmasRobbery",
      header:"The great Father Christmas robbery",
      blurb:`What happens when a robber pretends to be Father Christmas.`,
      mouseOverSound:"santa.mp3",
      recommendedVolume:1
    },
    
    { fileName:"elephantInTheGarden",
      header:"The elephant in the garden",
      blurb:`Claire is scared. She saw an elephant in the garden of her playschool and now she doesn&rsquo;t want to go. Enter Edgar, the friendly elephant, to save the day.`,
      mouseOverSound:"elephant.mp3",
      recommendedVolume:0.5
    },
    
//    { fileName:"edgarToTheRescue",
//      header:"Edgar to the rescue",
//      blurb:`Claire has a good idea to help Mr Chowdhury when his car wash breaks down`,
//      mouseOverSound:"elephant.mp3",
//      recommendedVolume:0.5
//    },
//    
    { fileName:"greatBigPyjamaSpot",
      header:"The great big pyjama spot",
      blurb:`The Prince of Slobodnia needs a very special pair of pyjamas.  But whatever has happened to the big pyjama spot?`,
      mouseOverSound:"yawn.mp3",
      recommendedVolume:0.2
    },
    
    { fileName:"carrotFactory",
      header:"The carrot factory",
      blurb:`Miss Davis works in a carrot factory &mdash; it&rsquo;s her job to paint the carrots orange. One day she gets bored of orange, and carrots are never the same again.`,
      mouseOverSound:"factory.mp3",
      recommendedVolume:1
    },
    
    { fileName:"giantEasterEgg",
      header:"The giant Easter egg",
      blurb:`The story of what happens when Mr Arkwright&rsquo;s Easter Egg machine goes wrong.`,
      mouseOverSound:"factory.mp3",
      recommendedVolume:0.5
    },
    
    { fileName:"blackbirdWhoCouldntFly",
      header:"The blackbird who couldn&rsquo;t fly",
      blurb:`Bill is a blackbird. He$rsquo;s just like any other blackbird... except for one thing. He&rsquo;s afraid of heights. Then Bill&rsquo;s friend has an idea ...`,
      mouseOverSound:"blackbirdMontage.mp3",
      recommendedVolume:1
    },
    
    { fileName:"boyWhoCaughtTheSun",
      header:"The boy who caught the sun",
      blurb:`It was hot. Very, very, very hot. Everybody was getting very tired and thirsty and cross. So Jim decided to do something about it ...`,
      mouseOverSound:"cicadas.mp3",
      recommendedVolume:0.7
    },
    
//    { fileName:"maj",
//      header:"Maj",
//      blurb:`Things aren&rsquo;t at all as Tracy expected when the Queen pops in to tea.`,
//      mouseOverSound:"maj.mp3",
//      recommendedVolume:1
//    },
//     
//    { fileName:"granCalledEdie",
//      header:"A gran called Edie",
//      blurb:`Michael thinks granny&rsquo;d really boring.  But how wrong he is!`,
//      mouseOverSound:"spitfire.mp3",
//      recommendedVolume:1
//    },
    
    { fileName:"moreToCome",
      infoOnly: true
    }
];


/******************************************************************************/
function displayStories ()
{
    for (var ix = 0; ix < C_Stories.length; ++ix)
    {
	var clickable = null != C_Stories[ix].blurb;
	var classes = "story-img";
	if (!G_HaveTouchScreen && clickable) classes += " story-img-shake";

    	var template = "<img class='" + classes + "' src='$img$' alt='$header$'";
	if (clickable) template += "onclick='storyClick(this, $ix$)' onmouseover='storyMouseOver(this, $ix$)' onmouseout='storyMouseOut(this, $ix$)' style='cursor:pointer'";
	template += "></img>";
	
	var s = template.replace("$img$", "img/" + C_Stories[ix].fileName + ".jpg");
	s = s.replace(/\$ix\$/g, ix.toString());
	s = s.replace(/\$header\$/g, C_Stories[ix].header);
	$("#story-" + (ix + 1)).html(s);
    }
}



/********************************************************************************/
/********************************************************************************/
/********************************************************************************/

/********************************************************************************/
function displayBottomOfScreen ()
{
    $("#main-content").css("visibility", "visible");  
    $("#footer-container").css("visibility", "visible");  
}


/********************************************************************************/
function displayTitle (finishedFn)
{
    $("#title-svg").attr("visibility", "visible");
    new Vivus("title-svg", { duration: getTimeout(299) + 1 }, finishedFn);
}



/********************************************************************************/
/********************************************************************************/
/********************************************************************************/
const C_TitleFills =
    [
	{id:"#dp_path002", fill:"red"},
	{id:"#dp_path003", fill:"lime"},
	{id:"#dp_path004", fill:"yellow"},
	{id:"#dp_path005", fill:"blue"},
	{id:"#dp_path006", fill:"#ff5c20"},
	{id:"#dp_path007", fill:"magenta"},
	{id:"#dp_path008", fill:"#de7f80"},
	{id:"#dp_path009", fill:"#7900fd"},
	{id:"#dp_path010", fill:"red"},
	{id:"#dp_path011", fill:"lime"},
	{id:"#dp_path012", fill:"yellow"},
	{id:"#dp_path013", fill:"blue"},
	{id:"#dp_path014", fill:"cyan"},
	{id:"#dp_path015", fill:"#f900ec"},
	{id:"#dp_path016", fill:"#ff6600"},
	{id:"#dp_path017", fill:"#00a4a1"}
    ];


/********************************************************************************/
function displayTitleFills (ix)
{
    if (ix >= C_TitleFills.length) return false;
    $(C_TitleFills[ix].id).attr("fill", C_TitleFills[ix].fill);
    return true;
}



/********************************************************************************/
/********************************************************************************/
/********************************************************************************/

/********************************************************************************/
/* Displays the '... and other stories' text. */

function displayAndOther (finishedFn)
{
    $("#and-other").css("visibility", "visible");
    finishedFn();
}





/********************************************************************************/
/********************************************************************************/
/**                                                                            **/
/**                               Event handling                               **/
/**                                                                            **/
/********************************************************************************/
/********************************************************************************/

/********************************************************************************/
/* Takes into account the effects of resizing and reorientation. */

function resize ()
{
    $("#and-other").fitText();
    
    var h1 = $("#header-row").outerHeight(true);
    var h2 = $("#footer-row").outerHeight(true);
    var h = (window.innerHeight - h1 - h2 - 2) + "px"; // I _think_ the -2 is to allow for the white borders at top and bottom.

    var div = document.getElementById("main-content");
    div.style.maxHeight = h;
    div.style.minHeight = h;
    div.style.height = h;
}


/******************************************************************************/
function storyClick (caller, ix)
{
    $("#story-details-modal").show();
    $("#story-details-header").html(C_Stories[ix].header);
    $("#story-details-blurb").html(C_Stories[ix].blurb);

    if (C_Stories[ix].fileName == "readMeFirst")
	$("#story-details-img").css("display", "none");
    else
    {
	$("#story-details-img").css("display", "block");
	$("#story-details-img").attr("src", "img/" + C_Stories[ix].fileName + ".jpg");
	$("#story-details-img").prop("alt", C_Stories[ix].header);
    }

    if (C_Stories[ix].infoOnly)
	$("#story-details-buttons").hide();
    else
    {
	$("#story-details-play-mp3")        .attr("src",  "resources/" + C_Stories[ix].fileName + "/" + C_Stories[ix].fileName + ".mp3");
	$("#story-details-download-mp3")    .attr("href", "resources/" + C_Stories[ix].fileName + "/" + C_Stories[ix].fileName + ".mp3");
	$("#story-details-download-booklet").attr("href", "resources/" + C_Stories[ix].fileName + "/" + C_Stories[ix].fileName + ".pdf");
	$("#story-details-read-booklet")    .attr("href", "resources/" + C_Stories[ix].fileName + "/" + C_Stories[ix].fileName + ".pdf");
	$("#story-details-buttons").show();
    }

    $("#story-details-advertising").html(C_Advert);

    $("#story-details-modal-content").width($("#story-details-table").width() + 10);
}


/******************************************************************************/
function closeStoryModal ()
{
    document.getElementById('story-details-modal').style.display='none';
    $("#story-details-play-mp3").trigger("pause");
}


/******************************************************************************/
function storyMouseOut (caller, ix)
{
    if (null === G_StoryAudio) return;
    G_StoryAudio.pause();
    G_StoryAudio = null;
}


/******************************************************************************/
function storyMouseOver (caller, ix)
{
    if (G_HaveTouchScreen) return;
    var sound = C_Stories[ix].mouseOverSound;
    if (null === sound) return;
    G_StoryAudio = new Audio("audio/" + sound);
    try { G_StoryAudio.volume = C_Stories[ix].recommendedVolume; } catch (e) { }
    G_StoryAudio.play();
}
