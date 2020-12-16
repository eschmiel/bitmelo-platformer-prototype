const input = engine.input;
const screen = engine.screen;
const audio = engine.audio;


var entityList = []; //A master list of all game entities (not including bounding boxes)

var gravity = 0;


class Animation { //This creates an object containing an animation.
//The passed value must be a 2 dimensional array. The first dimension lists the animation sprites in order.
//The second dimension must contain two values. The first value is the gID of the sprite for that frame.
//The second value is how many update cycles to sit on that frame. Bitmello averages 60 frames per second.
	constructor(frameData) {
		this.frameData = frameData;
		this.frameCount = 0; //What the current frame of the animation is
		this.currentSprite = 0; //What sprite the animation is currently on (not gID, but the current value of the first dimension of frameData)
		this.animationLength = 0; //The total length of the animation in frames.
		this.active = false;
		this.spriteSwitchFrames = [];
		
		for(let x=0; x<this.frameData.length; x++) { //This loop calculates the length of the animation
			
			this.spriteSwitchFrames.push(this.frameData[x][1] + this.animationLength); //This marks each frame when the sprite switches
			this.animationLength += this.frameData[x][1];
			
		}
	}
	
	runAnimation() {
		let drawSprite = this.frameData[this.currentSprite][0]; //sets the current sprite of the animation to draw
		
		this.frameCount += 1;
		
		if(this.frameCount==this.spriteSwitchFrames[this.currentSprite]) { //progresses to the next sprite of the animation if the time is up for the current one
			this.currentSprite += 1;
		}
		
		if(this.currentSprite >= this.frameData.length) {
			this.resetAnimation();
		}
		
		return drawSprite;
	}
	
	resetAnimation(){ //This resets the animation so it can be run from the beginning again	
		this.frameCount = 0;
		this.currentSprite = 0;		
	}	
}
		

class AnimationController { //A class that manages an entity's animations
	constructor(){
		this.state = null; //The current state of the entity
		this.animations = []; //An array of all animations in the controller. The first value is the state tied to the animation and the second value is the actual animation object
	}
	
	add(state, animation){ //Adds an animation to the controller and what state the entity should be in when running that animation
		this.animations.push([state, animation]);
	}
	
	setState(state){ //Sets the current state of the animation controller
		let currentAnimation = this.currentAnimation();

		if (this.state !== null && this.state != state) {
			this.animations[currentAnimation][1].resetAnimation();
		}

		this.state = state;
	}
	
	
	currentAnimation(){ //This returns the current animation set in the animation controller according to its state.
		let counter = 0;
		for (let test of	this.animations) {

			if (this.state == test[0]) {
				return counter;			
			}		
			
			counter++;
		}
	}
	
	
	animate(posX, posY, flip){
		let currentAnimation = this.currentAnimation();
		let drawSprite = this.animations[currentAnimation][1].runAnimation(); //Gets the current sprite of the current animation
			if(flip===0){
				screen.drawTile(drawSprite, Math.floor(posX), Math.floor(posY), flip); //Draws the current animation sprite at the given position
			}
			else{
				screen.drawTile(drawSprite, Math.ceil(posX), Math.floor(posY), flip);
			}			
	 }
}


class Entity { //General entity class for anything that takes up space on the screen
							
	constructor(posX, posY, width, height, sprite, facing) {
		this.posX = posX;
		this.posY = posY;
		this.height = height;
		this.width = width;
		this.sprite = sprite;
		this.facing = facing;
		this.animator = new AnimationController();
		this.velocityX = 0;
		this.velocityY = 0;
		
		}
	
	draw() {
		screen.drawTile(this.sprite, this.posX, this.posY, this.facing);
	}
	
	
	//This method will check for collisions on every point between where the entity started and where they will move to each frame.
	//This will prevent entities from tunneling through each other by moving too fast.
	processCollisions(velocityX, velocityY, collider) { 
		let dirX = Math.sign(velocityX); //This tracks what direction the entity is moving on the x axis
		let dirY = Math.sign(velocityY); //This tracks what direction the entity is moving on the Y axis
		
		let totalMovementX = Math.abs(velocityX);  //This set of statements sets the total number of points to check along each axis
		let totalMovementY = Math.abs(velocityY);
		totalMovementX = Math.ceil(totalMovementX);
		totalMovementY = Math.ceil(totalMovementY);
		
		let posXToCheck = collider.posX; //Having the collider's starting values gives us what we need to call its .update method
		let posYToCheck = collider.posY;
		let colliderWidth = collider.width;
		let colliderHeight = collider.height;
		
		let pointToCheck = 0; //This is the point we're currently checking
		
		
		do {
			
			if(pointToCheck <= totalMovementX){ //Checks to see if we've reached the collider's total movement yet for each axis, and if not
				posXToCheck += dirX;										//it increments the point to check along that axis by one
			}
			if(pointToCheck <= totalMovementY){
				posYToCheck += dirY;
			}
			collider.update(posXToCheck, posYToCheck, colliderWidth, colliderHeight); //This moves the collider to the point to check
			for(let i=0;i<environmentalBoundingBoxes.boxList.length;i++){ //Checks every wall, if it collides, it returns which wall it hit and how quickly it hit it
				if(checkCollision(collider, environmentalBoundingBoxes.boxList[i].boundingBox)){
					return [i, pointToCheck];
				}
			}
			
			pointToCheck++;
			
		} while (pointToCheck <= Math.max(totalMovementX, totalMovementY));

		return false;
	}
}


//This class allows you to create a collision box and use it to check collisions,
class BoundingBox extends Entity {
	constructor(posX, posY, width, height) {
		super(posX, posY, width, height);
		
		//Gives the bounding box an id to reference it by on the master list of colliders
		
			
		//Declares the points of the collider
			this.bottomLeft = {x: posX, y: posY};								
			this.bottomRight = {x: posX + width, y: posY};
			this.topLeft = { x: posX, y: posY + height};
			this.topRight = { x: posX + width, y: posY + height};
		}

//This method changes the position of the collider		
		update(posX, posY, width, height) {
			this.posX = posX;
			this.posY = posY;
			this.height = height;
			this.width = width;
			
			this.bottomLeft = {x: posX, y: posY};
			this.bottomRight = {x: posX + width, y: posY};
			this.topLeft = { x: posX, y: posY + height};
			this.topRight = { x: posX + width, y: posY + height};
		}

//This method draws the bounding box on the screen
		draw(color) {
			screen.drawRectBorder(Math.floor(this.posX), Math.floor(this.posY), this.width, this.height, color);
		}
}

class Flower extends Entity {
	constructor(posX, posY, width, height){
		super(posX, posY, width, height, 3, 0);
		
		this.entityId = entityList.length;
		
		this.boundingBox = new BoundingBox(this.posX, this.posY, width, height);
		
		entityList.push(this);
	}
}

/////////////////////////////////////////////////////////////////////////
class Camera {
	constructor(posX, posY, width, height, tileWidth) {
		this.mapX = posX - 1;
		this.mapY = posY - 1;
		this.tileWidth = tileWidth;
		this.width = width + (2 * tileWidth);
		this.height = height + (2 * tileWidth);
		
		this.drawX = 0 - this.tileWidth;
		this.drawY = 0 - this.tileWidth;
		this.cameraOffset = 0;
		this.leftCollider = new BoundingBox(0,0,64,160);
		this.rightCollider = new BoundingBox(128,0,64,160);
		this.topCollider = new BoundingBox(0,112,192,16);
		this.bottomCollider = new BoundingBox(0,0,192,16);
	}
	
	update() {
		if(this.mapX < 15){
			if(checkCollision(player.rightCollider, this.rightCollider)){
				this.drawX -= player.velocityX;
				this.cameraOffset -= player.velocityX;
				
				if(this.drawX <= -32) {
					this.mapX +=1;
					this.drawX = -16;
					this.cameraOffset = 0;
					player.update(false);
				}
				player.posX = (this.rightCollider.posX - 11 - Math.floor(player.velocityX));
				if(player.facing===1){
					player.posX -=2;
				}
				
				player.updateBoundaryBoxes();
				player.wallCheck();
			}
		}
		
		if(this.mapX > -2){
			if(checkCollision(player.leftCollider, this.leftCollider)){
				
				this.drawX -= player.velocityX;
				this.cameraOffset -= player.velocityX;

				if(this.drawX >= 0){
					this.mapX -= 1;
					this.drawX = -16;
					this.cameraOffset = 0;
					player.update(false);
				}
				player.posX = (this.leftCollider.posX + 61 - Math.ceil(player.velocityX));
				if(player.facing===1){
					player.posX -=2;
				}
				
				player.updateBoundaryBoxes();
				player.wallCheck();
				
			}
		}
	}
}

/////////////////////////////////////////////////////////////////////////

class Player extends Entity {
	constructor(posX, posY, width, height, sprite, facing) {
		super(posX, posY, width, height, sprite, facing);
		
		this.jumpTime = 18;
		this.jumpCount = 0;
		this.jumpFallGrav = 0.33;
		
		this.topSpeed = 2.8;
		this.velocityY = 0;
		this.isJumping = false;
		this.velocityX = 0;
		this.weight = 0.06;
		this.weight2 = 0.2;
		this.jumpSpeed = calcJumpSpeed(32,this.jumpTime);
		this.state;
		this.gravity = calcGrav(32, this.jumpTime);
		this.isGrounded = false;
		
		console.log(this.gravity);
		
		this.animator.add("idle", new Animation([[241, 20],
												[242, 20],
												[241, 10],
												[243, 10],
												[241, 10],
												[246, 5],
												[241, 10],
												[243, 10],
												[244, 20],
												[245, 5],
												[244, 10],
												[242, 30]]));
																						 
		this.animator.add("walk", new Animation([[227, 5],
												[228, 5],
												[225, 5],
												[226, 5]]));																				 
		
		this.animator.setState("idle");
							
		this.topCollider = new BoundingBox(Math.floor(this.posX+7), this.posY+6, 1, 10);
		this.bottomCollider = new BoundingBox(Math.floor(this.posX+7), this.posY-8, 1, 8);
		this.rightCollider = new BoundingBox(Math.floor(this.posX+8), this.posY+4, 3, 8);
		this.leftCollider = new BoundingBox(Math.floor(this.posX+4), this.posY+4, 3, 8);
		
		this.groundCheck = new BoundingBox(this.posX+4, this,posY-1, 7, 2);
		}
		
	updateBoundaryBoxes() {
		if(this.facing === 0 ){
			this.topCollider.update(Math.floor(this.posX+7), this.posY+6, 1, 10);
			this.bottomCollider.update(Math.floor(this.posX+7), this.posY, 1, 4);
			this.rightCollider.update(Math.floor(this.posX+8), this.posY+4, 3, 8);
			this.leftCollider.update(Math.floor(this.posX+4), this.posY+4, 3, 8);
			
			this.groundCheck = new BoundingBox(Math.floor(this.posX+5), this.posY-1, 5, 2);
		}
			
		else {
			this.topCollider.update(Math.ceil(this.posX+8), this.posY+6, 1, 10);
			this.bottomCollider.update(Math.ceil(this.posX+8), this.posY, 1, 4);
			this.rightCollider.update(Math.ceil(this.posX+9), this.posY+4, 3, 8);
			this.leftCollider.update(Math.ceil(this.posX+5), this.posY+4, 3, 8);
			
			this.groundCheck = new BoundingBox(Math.ceil(this.posX+6), this.posY-1, 5, 2);
		}
	}
		
	update(shouldMove) {
		this.jumpSpeed = calcJumpSpeed(32,this.jumpTime);
		this.gravity = calcGrav(32, this.jumpTime);

		this.isGrounded = this.checkIfGrounded();
		
		if(this.isJumping){
			this.jumpCount++;
		}
		
		if(this.isGrounded === false){
			if(this.jumpCount>this.jumpTime){
				this.velocityY = this.velocityY - this.jumpFallGrav;
			}
			else{
				this.velocityY = this.velocityY - this.gravity;
			}
		}
		else {
			this.velocityY = 0;
		}
		
		if (shouldMove) {
			this.move();
		}
			
		if(!input.left.pressed && !input.right.pressed){
			this.animator.setState("idle");
		
			if(Math.abs(player.velocityX)<0.1){
				player.velocityX=0;
			}
		}

		this.posX = this.posX + this.velocityX;
		this.posY = this.posY + this.velocityY;

		this.wallCheck();
		this.updateBoundaryBoxes();
		}
		
		move() {
			
			if (input.left.pressed) {
				if(this.velocityX>0.1){
					this.velocityX = 0.1;
				}
				this.velocityX = lerp(this.velocityX, -this.topSpeed, this.weight);
			
				this.animator.setState("walk");
				this.facing = 1;
			}
			if (input.right.pressed) {
				if(this.velocityX<-0.1){
					this.velocityX = -0.1;
				}
				this.velocityX = lerp(this.velocityX, this.topSpeed, this.weight);
				this.animator.setState("walk");
				this.facing = 0;
			}
			if (input.up.down) {
				if(this.groundCheck) {
					this.jump();
				}
			}
			
			if(!input.right.pressed && !input.left.pressed){
				this.velocityX = lerp(this.velocityX, 0, this.weight2);
			}
		}
		
		
		jump() {
			this.isJumping = true;
			
			this.velocityY = this.jumpSpeed;
		}
	
	wallCheck(){
		let topCheck = this.processCollisions(this.velocityX, this.velocityY, this.topCollider);
		let rightCheck = this.processCollisions(this.velocityX, this.velocityY, this.rightCollider);
		let bottomCheck = this.processCollisions(this.velocityX, this.velocityY, this.bottomCollider);
		let leftCheck = this.processCollisions(this.velocityX, this.velocityY, this.leftCollider);
		let envBoxes = environmentalBoundingBoxes.boxList;
		let checks = [topCheck, rightCheck, bottomCheck, leftCheck];
		
		let closestD = 100;
		
		for(let i=0;i<4;i++){
			if(checks[i]!==false && checks[i][1]<closestD){
				closestD=checks[i][1];
			}
		}
		
		let closestCollison = [];
		
		for(let i=0;i<4;i++){
			if (checks[i][1] == closestD){
				closestCollison.push(i);
			}
		}
		
		closestCollison.forEach(function(element){
		
			if(element === 0){
				player.posY = envBoxes[topCheck[0]].boundingBox.posY-16;
			}
			
			if(element == 1){
				player.posX = envBoxes[rightCheck[0]].boundingBox.posX-11;
				if(player.facing == 1){
					player.posX-=2;
				}
				player.velocityX=0;

			}
			
			if(element == 2){
				player.posY = envBoxes[bottomCheck[0]].boundingBox.posY+16;
			}
			
			if(element == 3){
				player.posX = envBoxes[leftCheck[0]].boundingBox.posX+13;
				if(player.facing == 1){
					player.posX-=2;
				}
				player.velocityX=0;
				
			}
		});
		
		player.updateBoundaryBoxes();
		
	}	
	
	checkIfGrounded(){
		let tileCheckPosX = 16 * Math.floor(this.groundCheck.posX / 16);
		let posDiff = Math.abs(this.groundCheck.posX - tileCheckPosX);
		let tileCheck;
		let tileCheck2;

		for(let i=0; i<environmentalBoundingBoxes.boxList.length; i++){
			if(checkCollision(this.groundCheck, environmentalBoundingBoxes.boxList[i].boundingBox)){
				player.jumpCount=0;
				player.isJumping = false;
				return true;
			}
		}		
		return false;
}

var player = new Player(100, 64, 16, 16, 1, 0);
var camera = new Camera(0, 5, 192, 128, 16);

var environmentalBoundingBoxes = {
	
	boxList: [],
	created: 0,
	count: 0,
	
	create(mapX, mapY, width, height, tileWidth, drawX, drawY) { 
		let pixelX = drawX;
		let pixelY = drawY;
		
		for(let y = (mapY); y<(mapY + (height/tileWidth)); y++){
			for(let x = (mapX); x<(mapX + (width/tileWidth)); x++){
					
				if	(engine.mapData.getTile(x,y,0,0)==113) {
					this.boxList.push({boundingBox: new BoundingBox(pixelX,pixelY,16,16), pixelX: pixelX, pixelY: pixelY});				
				}
				pixelX += tileWidth;
			}
			pixelY += tileWidth;
			pixelX = drawX;
		}
	
	this.created = 1;
		
	},
	
	update(mapX, mapY, width, height, tileWidth, drawX, drawY) { 
		let spliceCount = this.boxList.length;
		
		for(x=0; x<spliceCount; x++){
			this.boxList.splice(0, 1);		
		}
		
		this.create(mapX, mapY, width, height, tileWidth, drawX, drawY);
	}
		
};

var flower1 = new Flower(122, 48, 16, 16);	

engine.onInit = () => {
		if (environmentalBoundingBoxes.created === 0){
		environmentalBoundingBoxes.create(Math.floor(camera.mapX), 
											camera.mapY, 
											camera.width, 
											camera.height, 
											camera.tileWidth,
											camera.drawX,
											camera.drawY);
	}
};

engine.onUpdate = () => {
	
	screen.clear(1);
	
	camera.update();
	
	screen.drawMap(
		Math.floor(camera.mapX),
		camera.mapY,
		camera.width,
		camera.height,
		Math.floor(camera.drawX),
		camera.drawY,
		0,
		0
	);

	environmentalBoundingBoxes.update(Math.floor(camera.mapX), 
										camera.mapY, 
										camera.width, 
										camera.height, 
										camera.tileWidth,
										camera.drawX,
										camera.drawY);
	
	player.update(true);
	
	player.animator.animate(player.posX, player.posY, player.facing);

	debugButton();
};

function drawBoundingBoxes(boundingBoxList) {
	let colorIndex = 7;

	for(let x = 0; x<boundingBoxList.length; x++){
		boundingBoxList[x].boundingBox.draw(colorIndex);
		
		if (colorIndex > 16) {
			colorIndex = 2;
		}		
	}
}

function drawPlayerColliders(){
	player.topCollider.draw(9);
	player.bottomCollider.draw(15);
	player.leftCollider.draw(9);
	player.rightCollider.draw(9);
	screen.drawRectBorder(Math.floor(player.posX), player.posY, player.width, player.height, 9);
}

function drawCameraColliders(){
	camera.topCollider.draw(8);
	camera.bottomCollider.draw(8);
	camera.leftCollider.draw(8);
	camera.rightCollider.draw(8);
}

function debugButton(a) {
	if (input.action1.down){
		drawBoundingBoxes(environmentalBoundingBoxes.boxList);
		drawPlayerColliders();
		drawCameraColliders();
		console.log(a);
		player.jumpFallGrav -= 0.01;
		console.log("jumpFallGrav: " + player.jumpFallGrav);
	}
	
	if (input.action2.down){
	 player.jumpFallGrav += 0.01;
		 console.log("jumpFallGrav: " + player.jumpFallGrav);
	}
}

function checkCollision(a, b) {
	
	if(((a.topLeft.x <= b.bottomRight.x && a.topLeft.x >= b.bottomLeft.x)
		||(a.topRight.x <= b.bottomRight.x && a.topRight.x >= b.bottomLeft.x))
		&&
		 ((a.topLeft.y >= b.bottomLeft.y && a.topLeft.y <= b.topLeft.y)
		||(a.bottomLeft.y <= b.topLeft.y && a.bottomLeft.y >= b.bottomLeft.y)))
		{
			return true;
		}
	if(((b.topLeft.x <= a.bottomRight.x && b.topLeft.x >= a.bottomLeft.x)
		||(b.topRight.x <= a.bottomRight.x && b.topRight.x >= a.bottomLeft.x))
		&&
		 ((b.topLeft.y >= a.bottomLeft.y && b.topLeft.y <= a.topLeft.y)
		||(b.bottomLeft.y <= a.topLeft.y && b.bottomLeft.y >= a.bottomLeft.y)))
		{
			return true;
		}
	return false;
	
}

function lerp(origin, end, weight) {
	return	origin*(1-weight) + (weight*end);
	
}

function updateBoundingBoxList() {
	
	for(let x = 0; x < boundingBoxList.length; x++){
		boundingBoxList[x].boundingBoxListIndex = x;
	}
}

function calcGrav(height, time){
	return (2 * height) / (time * time);
}

function calcJumpSpeed(height, time){
	return (2 * height) / time;
}
