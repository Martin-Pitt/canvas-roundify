
// Awesome little JS to add rounded corners to an array of coordinates for a canvas path
window.Roundify = function(vectors, radius, padding, reverse, sharpen) {
	this.vectors = vectors || []; // Internal list of coordinates, (! array may be replaced via .reverse() operation instead of being mutated in-place !)
	this._radius = (radius == undefined)? 4 : radius; // Smooths a shape by adding rounded corners (TODO: Try accept a border-radius CSS string and emulate algorithmic behaviour with maximum size corners)
	this._padding = (padding == undefined)? 0 : padding; // Expands or contracts a path (careful when using with concave as shapes are not merged properly)
	this._reverse = (reverse == undefined)? false : reverse; // false/true; Whether to reverse the path for use in path:  inclusion/exclusion  respectively
	this._sharpen = (sharpen == undefined)? false : sharpen; // false/true/0.5; Whether to snap coordinates:  not at all/by integers/0.5 offset  respectively
}

Roundify.prototype = {
	// Round the corners
	radius: function(radius) {
		for(var iterator = 0, total = this.vectors.length / 2; iterator < total; ++iterator)
		{
			var start = iterator * 6;
			var end = (iterator == total - 1)? 0 : start + 2;
			
			var v0 = [this.vectors[start], this.vectors[start + 1]];
			var v1 = [this.vectors[end], this.vectors[end + 1]];
			var dist = this.distance(v0, v1);
			
			if(dist > radius*2)
			{
				dist = radius;
			}
			else
			{
				dist *= 0.5;
			}
			
			var v2 = this.sub(v1, v0);
			var v3 = this.sub(v0, v1);
			
			this.normalize(v2);
			this.normalize(v3);
			
			this.scale(v2, dist);
			this.scale(v3, dist);
			
			this.add(v2, v0, v2);
			this.add(v3, v1, v3);
			
			this.vectors.splice(start, 2,
				v0[0], v0[1],
				v2[0], v2[1],
				v3[0], v3[1]
			);
		}
		
		return this;
	},
	
	// Add padding to the shape
	padding: function(padding) {
		var newVectors = [];
		for(var iterator = 0, total = this.vectors.length; iterator < total; iterator += 2)
		{
			// Get previous point
			var p = iterator == 0? [
				this.vectors[total + iterator-2],
				this.vectors[total + iterator-1]
			] : [
				this.vectors[iterator-2],
				this.vectors[iterator-1]
			];
			
			// Get current point
			var c0 = iterator, c1 = iterator+1;
			var c = [
				this.vectors[c0],
				this.vectors[c1]
			];
			
			// Get next point
			var n = (iterator == total-2)? [
				this.vectors[0],
				this.vectors[1]
			] : [
				this.vectors[iterator+2],
				this.vectors[iterator+3]
			];
			
			this.sub(c, p, p);
			this.sub(c, n, n);
			
			this.normalize(p);
			this.normalize(n);
			
			var cp = this.cross([p[0], p[1], 0], [0,0,1]);
			var cn = this.cross([0,0,1], [n[0], n[1], 0]);
			var cross = this.add(cp, cn);
			this.normalize(cross);
			this.scale(cross, padding);
			this.add(c, cross, c);
			
			newVectors[c0] = c[0];
			newVectors[c1] = c[1];
		}
		
		this.vectors = newVectors;
		
		return this;
	},
	
	
	// Clip coordinates to pixel grid
	sharpen: function() {
		if(typeof this._sharpen == 'number')
			for(var iterator = 0, total = this.vectors.length; iterator < total; ++iterator)
				this.vectors[iterator] = ((this.vectors[iterator] + 0.5) | 0) + this._sharpen;
		else
			for(var iterator = 0, total = this.vectors.length; iterator < total; ++iterator)
				this.vectors[iterator] = (this.vectors[iterator] + 0.5) | 0;
			
		return this;
	},
	
	
	// Reverse vectors array
	reverse: function() {
		for(var i = 0, l = this.vectors.length, v = []; i < l; i += 2)
		{
			v.unshift(this.vectors[i], this.vectors[i+1]);
		}
		
		this.vectors.length = 0;
		this.vectors = v;
	},
	
	
	// Render path to context
	path: function(ctx) {
		// Apply parameters to vectors
		this.padding(this._padding);
		if(this._sharpen) this.sharpen();
		if(this._reverse) this.reverse();
		var hasRadius = this._radius > 0;
		if(hasRadius) this.radius(this._radius);
		
		// Shift array to make rendering easier (can use bitwise on iterator for order of operations)
		this.vectors.push(this.vectors.shift(), this.vectors.shift());
		
		// Render path
		for(var iterator = 0, index = 0, total = this.vectors.length; index < total; ++iterator)
		{
			if(iterator == 0)
			{
				ctx.moveTo(this.vectors[index++], this.vectors[index++]);
			}
			else if(!hasRadius || iterator & 1)
			{
				ctx.lineTo(this.vectors[index++], this.vectors[index++]);
			}
			else
			{
				ctx.quadraticCurveTo(this.vectors[index++], this.vectors[index++], this.vectors[index++ % total], this.vectors[index++ % total]);
			}
		}
		
		/* Leave it up to user;
		if(this._reverse)
		{
			// USER: This is an example of how you can fill in after rendering a reverse path:
			ctx.rect(0, 0, window.innerWidth, window.innerHeight);
		}
		*/
		
		return this;
	},
	
	
	// Geometry functions
	      add: function(a, b, out)		{ if(!out) return [ a[0] + b[0], a[1] + b[1] ]; else { out[0] = a[0] + b[0]; out[1] = a[1] + b[1]; } },
	      sub: function(a, b, out)		{ if(!out) return [ a[0] - b[0], a[1] - b[1] ]; else { out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; } },
	    scale: function(out, k)			{ out[0] *= k; out[1] *= k; },
	 distance: function(a, b)			{ var x = b[0] - a[0], y = b[1] - a[1]; return Math.sqrt(x*x + y*y); },
	normalize: function(out)			{ var len = out[0] * out[0] + out[1] * out[1]; if(len > 0) { len = 1 / Math.sqrt(len); out[0] *= len; out[1] *= len; } },
	      dot: function(a, b)			{ return a[0] * b[0] + a[1] * b[1]; },
	    cross: function(a, b, out)		{ if(!out) return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]]; else { out[0] = a[1]*b[2] - a[2]*b[1]; out[1] = a[2]*b[0] - a[0]*b[2]; out[2] = a[0]*b[1] - a[1]*b[0]; } },
	conjugate: function(out)			{ out[0] = -out[0]; out[1] = -out[1]; }
};
