/********************************************************************************/
var G_StoryAudio = null;
var G_WantAnimation = true;





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
   not the user has asked for animation (which we take as also imply that sounds
   should be played.

   If there is no animation, we simply call the given function, if it is defined.

   If there is animation, and the function is defined, then we arrange for it
   to be called after we've finished playing the audio clip.

   Then, whether the function is defined or not, we play the clip. */

function doPlay (audio, fn)
{
    if (G_WantAnimation)
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
	doPlay(audio, function () { runElementWithoutAudio(fn, audio, ix + 1, finishedFn); });
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
				      runElementWithAudio(element.arrayFn, document.getElementById(element.audio), 0, resolver);
				  
				  else if (element.arrayFn)
				      runElementWithoutAudio(element.arrayFn, 0, resolver);
				  
				  else if (element.audio)
				      runElementWithAudio(dummyFunctionForAudio, document.getElementById(element.audio), 0, resolver);

				  else if (element.justDoIt)
				  {
				      element.justDoIt();
				      resolver();
				  }
			      });

    var nextFn = function (x) { runSequence1(ix + 1); };
    promise.then(result => nextFn(result), error => alert("Oops"));
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
const C_Stories = [
    { fileName:"readMeFirst",
      header:"Before you start",
      blurb:`<br><div style="text-align:center;text-decoration:underline;font-weight:bold">Welcome!</div>
             <p>Gentle, timeless, calming stories for younger children.</p>
             <p>Each story is available as a text file for you to read to your child, or as a professionally-voiced MP3 file which you can listen to online or download.
                Each also comes with a downloadable activity sheet which contains teh text of the story, some things your child can do on their own, and some you can do with them.</p>
             <p>We aim to continue adding new material, so make sure you visit this site regularly!</p><hr style="border-color:black">



             <div style="text-align:center;text-decoration:underline;font-weight:bold">Do I have to pay?</div>
             <p>No &mdash; no payment is required.  If you&rsquo;d <i>like</i> to make a small donation, that&rsquo;s great &mdash; we appreciate it (click on the button in the footer of this page).
                But you&rsquo;re welcome to use the material here without charge.<p>
             <p>We don&rsquo;t use cookies either, and we don&rsquo;t carry third-party adverts.</p><hr style="border-color:black">



             <div style="text-align:center;text-decoration:underline;font-weight:bold">Downloading</div>
             <p>You can download individual files by clicking on the various tiles on this web page.  Alternatively, click the links below to download complete collections.</p>

	     <div style="text-align:center">
               <a id="story-details-download-mp3"      download class="w3-btn w3-green" target="_blank" rel="noopener noreferrer" href="???"><i class="fa fa-headphones"></i> MP3</a>&nbsp;
	       <a id="story-details-download-activity" download class="w3-btn w3-green" target="_blank" rel="noopener noreferrer" href="???"><i class="fa fa-download"></i> Activity</a><br><br>
            </div><hr style="border-color:black">



            <div style="font-size:xx-small;font-weight: normal">
             <div style="text-align:center;text-decoration:underline;font-weight:bold">Copyright</div>
             <p>Stories are &copy; ARA Jamieson 2020.  MP3 versions are &copy; <a href="http://www.christopherjamieson.co.uk">CT Jamieson</a> 2020.
                The music which forms part of the MP3s is &copy; <a href="http://www.racheljamieson.com">RA Jamieson</a>.
                Some of the colouring-in pictures in the activity sheets are &copy; <a href="http://www.etsy.com/uk/shop/LittlePaperTrails">Samantha Purkis.2020</a></p>


               <p><i class="fa fa-creative-commons" aria-hidden="true"></i> This work is licensed under CC BY-NC-ND 4.0. To view a copy of this licence, visit
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
      infoOnly: true
    },
    
//    { fileName:"pedroAndTheWaterMelon",
//      header:"Pedro and the Water Melon",
//      blurb:`Pedro and his brothers and sisters need new clothes. But their mummy doesn&rsquo;t have enough money. Then Pedro has an idea. A very good idea indeed.`,
//      mouseOverSound:"pedro.mp3"
//    },
//    
//    { fileName:"sarahAndTheRobbers",
//      header:"Sarah and the Robbers",
//      blurb:`Robbers are stealing all the farmers&rsquo; sweetcorn. Will Sarah be able to come to the rescue?`,
//      mouseOverSound:"sarahAndTheRobbers.mp3"
//    },
//    
    { fileName:"elephantInTheGarden",
      header:"The elephant in the garden",
      blurb:`Claire is scared. She saw an elephant in the garden of her playschool and now she doesn&rsquo;t want to go. Enter Edgar, the friendly elephant, to save the day.`,
      mouseOverSound:"elephant.mp3"
    },
    
//    { fileName:"edgarToTheRescue",
//      header:"Edgar to the rescue",
//      blurb:`Claire has a good idea to help Mr Chowdhury when his car wash breaks down`,
//      mouseOverSound:"elephant.mp3"
//    },
//    
    { fileName:"greatBigPyjamaSpot",
      header:"The great big pyjama spot",
      blurb:`The Prince of Slobodnia needs a very special pair of pyjamas.  But whatever has happened to the big pyjama spot?`,
      mouseOverSound:"yawn.mp3"
    },
    
    { fileName:"carrotFactory",
      header:"The carrot factory",
      blurb:`Miss Davis works in a carrot factory &mdash; it&rsquo; her job to paint the carrots orange. One day she gets bored of orange, and carrots are never the same again.`,
      mouseOverSound:"factory.mp3"
    },
    
    { fileName:"giantEasterEgg",
      header:"The giant Easter egg",
      blurb:`The story of what happens when Mr Arkwright&rsquo;s Easter Egg machine goes wrong.`,
      mouseOverSound:"factory.mp3"
    },
    
    { fileName:"blackbirdWhoCouldntFly",
      header:"The blackbird who couldn&rsquo;t fly",
      blurb:`Bill is a blackbird. He$rsquo;s just like any other blackbird... except for one thing. He&rsquo;s afraid of heights. Then Bill&rsquo;s friend has an idea ...`,
      mouseOverSound:"blackbirdMontage.mp3"
    },
    
    { fileName:"boyWhoCaughtTheSun",
      header:"The boy who caught the sun",
      blurb:`It was hot. Very, very, very hot. Everybody was getting very tired and thirsty and cross. So Jim decided to do something about it ...`,
      mouseOverSound:"cicadas.mp3"
    },
    
//    { fileName:"maj",
//      header:"Maj",
//      blurb:`Things aren&rsquo;t at all as Tracy expected when the Queen pops in to tea.`,
//      mouseOverSound:"maj.mp3"
//    },
//     
//    { fileName:"granCalledEdie",
//      header:"A gran called Edie",
//      blurb:`Michael thinks granny&rsquo;d really boring.  But how wrong he is!`,
//      mouseOverSound:"spitfire.mp3"
//    },
    
//    { fileName:"greatFatherChristmasRobbery",
//      header:"The great Father Christmas robbery",
//      blurb:`What happens when a robber pretends to be Father Christmas`,
//      mouseOverSound:"santa.mp3"
//    },
//    
      { fileName:"moreToCome",
        header:"More to come",
        blurb:`Look out for more stories in future!`,
        infoOnly: true
      }
];


/******************************************************************************/
function displayStories ()
{
    const template = "<img class='story-img' src='$img$' alt='$header$' onclick='storyClick(this, $ix$)' onmouseover='storyMouseOver(this, $ix$)' onmouseout='storyMouseOut(this, $ix$)' ></img>";

    for (var ix = 0; ix < C_Stories.length; ++ix)
    {    
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
    $("#story-details-img").attr("src", "img/" + C_Stories[ix].fileName + ".jpg");
    $("#story-details-img").prop("alt", C_Stories[ix].header);
    $("#story-details-blurb").html(C_Stories[ix].blurb);

    if (C_Stories[ix].infoOnly)
	$("#story-details-buttons").hide();
    else
    {
	$("#story-details-play-mp3")         .attr("src",  "resources/" + C_Stories[ix].fileName + "/" + C_Stories[ix].fileName + ".mp3");
	$("#story-details-download-mp3")     .attr("href", "resources/" + C_Stories[ix].fileName + "/" + C_Stories[ix].fileName + ".mp3");
	$("#story-details-download-activity").attr("href", "resources/" + C_Stories[ix].fileName + "/" + C_Stories[ix].fileName + ".pdf");
	$("#story-details-buttons").show();
    }

    $("#story-details-modal-content").width($("#story-details-table").width() + 10);
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
    var sound = C_Stories[ix].mouseOverSound;
    if (null === sound) return;
    G_StoryAudio = new Audio("audio/" + sound);
    G_StoryAudio.play();
}
