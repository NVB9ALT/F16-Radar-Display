let traffic = Object.values(multiplayer.users)
let range = 160;
let locked = new Boolean(0);
let locking = new Boolean(0);
let tracking = new Boolean(0);
let lockedUserId = 0;
let cursorX = 500;
let cursorY = 500;
	 //Thanks to AriakimTaiyo for most of these functions, and the canvas class thingy that I've used to create the display.
function radians(n) {
  return n * (Math.PI / 180);
};
function degrees(n) {
  return n * (180 / Math.PI);
};
function getBearing(a, b, c, d) {
  var startLat = radians(c);
  var startLong = radians(d);
  var endLat = radians(a);
  var endLong = radians(b); 
  let dLong = endLong - startLong; 
  let dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0)); 
  if (Math.abs(dLong) > Math.PI) { 
    if (dLong > 0.0) 
	   dLong = -(2.0 * Math.PI - dLong); 
    else 
	   dLong = (2.0 * Math.PI + dLong); 
  } 
  return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
};
function getAltDiff(self, player) {
   return Math.abs(self - player)
}
function percent(value, total) {
   //the /2 is specifically for this use case
	//the percent calculation is just (value/total) * 100
   return (Math.abs((value/total) * 100))/2
}
class RADARsim {
  constructor(resX, resY, sizeX, sizeY) {
    // IMP VALUES ! NO CHANGE !!
    this.Values = {};
    this.Values.LocDev = 0;
    this.Values.GSDev = 0;
    this.Values.Heading = 0;

    // Everything Else LOL
    this.VisibilityToggleButton;
    this.Display = {};
    this.Display.Element;
    this.Display.Context;
    this.Display.Width = resX;
    this.Display.Height = resY;
    this.Display.SizeWidth = sizeX;
    this.Display.SizeHeight = sizeY;
    this.Events = [];
  }
  // Implement Show/Hide Canvas
  AssignVisibilityToggleButton(element) {
    this.VisibilityToggleButton = element;
    let self = this;
    this.VisibilityToggleButton.onclick = function() {
      if (this.innerText == "show") {
        self.Display.Element.style.visibility = "visible";
        this.innerText = "hide";
      } else {
        self.Display.Element.style.visibility = "hidden";
        this.innerText = "show";
      }
    };
  }
  MakeLine(color, x1, y1, x2, y2) {
    this.Display.Context.beginPath();
    this.Display.Context.strokeStyle = color;
    this.Display.Context.moveTo(x1, y1);
    this.Display.Context.lineTo(x2, y2);
    this.Display.Context.stroke();
  }
  MakeText(text, color, x, y, font) {
    this.Display.Context.beginPath();
    let prevColor = this.Display.Context.fillStyle;
    let prevFont = this.Display.Context.font;
    this.Display.Context.beginPath();
    this.Display.Context.fillStyle = color;
    if (font) {
      this.Display.Context.font = font;
    }
    this.Display.Context.fillText(text, x, y);
    this.Display.Context.fillStyle = prevColor;
    this.Display.Context.font = prevFont;
  }
  // Non-Interactive Rectangle Making.
  MakeRect(fill, color, x, y, width, height) {
    this.Display.Context.beginPath();
    this.Display.Context.strokeStyle = color;
    this.Display.Context.rect(x, y, width, height);
    this.Display.Context.stroke();
    this.Display.Context.fillStyle = fill;
    this.Display.Context.fill();
  }
  // Interactive Rectangle Making.
  MakePolygon(points, fillColor, outlineColor, onclick) {
    if (onclick) {
      this.AddEventToCanvas(points, onclick);
    }
    this.Display.Context.beginPath();
    this.Display.Context.moveTo(points[0][0], points[0][1]);
    points = points.slice(1);
    let a;
    for (a of points) {
      let x = a[0];
      let y = a[1];
      this.Display.Context.lineTo(x, y);
    }
    this.Display.Context.fillStyle = fillColor;
    this.Display.Context.fill();
    this.Display.Context.strokeStyle = outlineColor;
    this.Display.Context.stroke();
  }
  MakeCircle(fillColor, strokeColor, x, y, r, startAngle, endAngle, antiClockwise) {
    this.Display.Context.beginPath();
    if (startAngle) {
      this.Display.Context.arc(x, y, startAngle, endAngle, antiClockwise);
    } else {
      this.Display.Context.arc(x, y, r, 0, 2 * Math.PI);
    }
    this.Display.Context.strokeStyle = strokeColor;
    this.Display.Context.stroke();
    this.Display.Context.fillStyle = fillColor;
    this.Display.Context.fill();
  }
  MakeRoundSlider(x, y, r, value, color1, color2, color3, color4, color5, color6, mouseMoveFunction, mouseUpFunction) {
    let extractedValue = this.Values[value];
    let direction = 360 / 100 * extractedValue;
    direction -= 90;
    this.MakeCircle(color2, color1, x, y, r);
    this.MakeCircle(color4, color3, x, y, r * 0.5);
    this.MakePolygon([
      [x + (Math.cos(A2R(direction + 90)) * -1), y + (Math.sin(A2R(direction + 90)) * -1)],
      [x + (Math.cos(A2R(direction + 90)) * 1), y + (Math.sin(A2R(direction + 90)) * 1)],
      [x + (Math.cos(A2R(direction + 90)) * 1) + (Math.cos(A2R(direction)) * r), y + (Math.sin(A2R(direction + 90)) * 1) + (Math.sin(A2R(direction)) * r)],
      [x + (Math.cos(A2R(direction + 90)) * -1) + (Math.cos(A2R(direction)) * r), y + (Math.sin(A2R(direction + 90)) * -1) + (Math.sin(A2R(direction)) * r)]
    ], color6, color5, function(a) {
      a.path[0].onmouseup = function(b) {
        mouseUpFunction(b);
        b.path[0].onmousemove = undefined;
      };
      a.path[0].onmousemove = function(b) {
        mouseMoveFunction(b);
      };
    });
  }
  AddEventToCanvas(points, func) {
    let newObj = { "points": points, "func": func };
    this.Events[this.Events.length] = newObj;
  }
  RemoveEventFromCanvas(event) {
    let index = this.Events.indexOf(event);
    if (index > -1) {
      this.Events.splice(index, 1);
    }
  }
  ResetEvents() {
    this.Events.length = 0;
  }
  SetupEventHandler() {
    let self = this;
    this.Display.Element.onmousedown = function(event) {
      let rect = event.target.getBoundingClientRect();
      let xRelation = self.Display.Width / self.Display.SizeWidth.slice(0, self.Display.SizeWidth.length - 2);
      let yRelation = self.Display.Height / self.Display.SizeHeight.slice(0, self.Display.SizeHeight.length - 2);
      let x = event.clientX - rect.left;
      let y = event.clientY - rect.top;
      x *= xRelation;
      y *= yRelation;
      console.log("X: " + x + "\nY: " + y);
      console.log(event);
      let a;
      for (a of self.Events) {
        let func = a.func;
        let vs = a.points;
        if (inside([x, y], vs)) {
          func(event);
          self.ResetEvents();
        }
      }
		range == 160000 ? range = 80000 : range = 160000
      self.rDraw();
    };
  }
  SetupCanvas() {
    this.Display.Element = document.createElement("canvas");
    this.Display.Element.width = this.Display.Width;
    this.Display.Element.height = this.Display.Height;
    this.Display.Element.style.width = this.Display.SizeWidth;
    this.Display.Element.style.height = this.Display.SizeHeight;
    this.Display.Element.style.position = "absolute";
    this.Display.Element.style.left = "80%";
    this.Display.Element.style.top = "50%";
    this.Display.Element.style.transform = "translate(-50%, -50%)";
    this.Display.Element.style.imageRendering = "crisp-edges";
    document.body.appendChild(this.Display.Element);
    this.Display.Context = this.Display.Element.getContext("2d");
    this.Display.Context.lineWidth = 10;
  }
  rDraw() {
    let w = this.Display.Width;
    let h = this.Display.Height;
    this.Display.Context.clearRect(0, 0, w, h)
    this.Draw();
  }
  Draw() {
    let heading = geofs.animation.values.heading360
    let w = this.Display.Width;
    let h = this.Display.Height;
    this.MakeRect("black", "white", 0, 0, w, h);
    traffic.forEach(function(e) {
//Somehow need to check if the user is inside the vertical viewing cone
//Implement notching mechanic
if (e.distance <= (range * 1000)) {
/*   if (locked == 1) {
if (e.id == lockedUserId) {
   display.MakeCircle("black", "white", (500 - (-(getBearing(e.referencePoint.lla[0], e.referencePoint.lla[1], geofs.aircraft.instance.llaLocation[0], geofs.aircraft.instance.llaLocation[1]) - geofs.animation.values.heading360) * 16.7)), (1000 - (e.distance/range)), 10)
}
	}*/
   if (locked != 1) {
   //Xpos = getBearing, max deflection 40 or -40, "500 - X" to center values
	//Ypos = distance, inverted by the "1000 - Y" so that shorter distance is at bottom of display instead of top
   display.MakeCircle("black", "white", (500 - (-(getBearing(e.referencePoint.lla[0], e.referencePoint.lla[1], geofs.aircraft.instance.llaLocation[0], geofs.aircraft.instance.llaLocation[1]) - geofs.animation.values.heading360) * 16.7)), (1000 - (e.distance/range)), 10)
/*	if () {
tracking = 1
lockedUserId = e.id
	} else {
tracking = 0
lockedUserId = 0
	}*/
}
   }
    })
	 //player's position marker
	 this.MakeLine("white", 450, 990, 550, 990)
	 this.MakeLine("white", 500, 990, 500, 975)
	 //range markers
	 this.MakeLine("green", 50, 10, 100, 10)
	 this.MakeLine("green", 50, 660, 100, 660)
	 this.MakeLine("green", 50, 330, 100, 330)
	 //angle markers
	 this.MakeLine("green", 750, 950, 750, 900)
	 this.MakeLine("green", 250, 950, 250, 900)
	 //cursor
	 this.MakeLine("white", cursorX - 20, cursorY - 20, cursorX - 20, cursorY + 20)
	 this.MakeLine("white", cursorX + 20, cursorY - 20, cursorX + 20, cursorY + 20)
  };
}
let display = null;
let rwDistances = [];
let minKey = 0;

function radarIntervalStart() {
radarInterval = setInterval(function() {
  traffic = Object.values(multiplayer.users);
  display.rDraw()
  console.log("Tracking: " + tracking + ", locking: " + locking + ", locked: " + locked + ", user: " + lockedUserId)
}, 100)
}

let array = []

function destroyDisplays() {
  array = []
  Object.values(document.getElementsByTagName("canvas")).forEach(function(e){if (e.width == 1000) array.push(e)})
  array.forEach(function(e){e.remove()})
}

let hide = false
function togglePanel(){
  if (!hide){
 display = new RADARsim(1000, 1000, "250px", "250px");
display.SetupCanvas();
display.SetupEventHandler();
display.Draw();

radarIntervalStart()
  hide = true;
  }
  else {
    destroyDisplays()
    hide = false;
  }
};
function rangeUp() {
	range = 160
}
function rangeDown() {
	range = 80
}
function cursorUp() {
if (cursorY > 0) {
	cursorY = cursorY - 20
}
}
function cursorDown() {
if (cursorY < 1000) {
	cursorY = cursorY + 20
}
}
function cursorLeft() {
if (cursorX > 0) {
	cursorX = cursorX - 20
}
}
function cursorRight() {
if (cursorX < 1000) {
	cursorX = cursorX + 20
}
}
locking = 0
function toggleLock() {
   if (tracking == 1 && locking == 0) {
locked = 1
locking = 1
	} else if (locking == 1) {
locked = 0
locking = 0
   }
}

document.addEventListener("keydown", function(e) {
	if (e.keyCode == 76) {
toggleLock()
	}
})
let radarControls = document.createElement("div")
radarControls.innerHTML = '<style>button{font-family:"Courier New",Courier,monospace;font-size: 18px;background-color:gray}.centerButton{text-align:center}.rightButton{float:right}</style><div class="centerButton"><button onclick="togglePanel()">Radar ON/OFF</button></div><button onclick="rangeUp()">#</button><button class="rightButton" onclick="cursorUp()">#</button><br><button onclick="rangeDown()">#</button><button class="rightButton" onclick="cursorDown()">#</button><div class="centerButton"><button onclick="cursorLeft()">#</button><button onclick="cursorRight()">#</button></div>';
document.getElementsByClassName("geofs-preference-controls")[0].appendChild(radarControls)
