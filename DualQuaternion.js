import { Quaternion, Vector3 } from './CMapJS/Libs/three.module.js';

/// Advanced Methods in Computer Graphics, R. Mukudan, ISBN 978-1-4471-2339-2
/// https://cs.gmu.edu/~jmlien/teaching/cs451/uploads/Main/dual-quaternion.pdf
/// https://github.com/brainexcerpts/Dual-Quaternion-Skinning-Sample-Codes
/// https://glmatrix.net/

class DualQuaternion {

	constructor( real = new Quaternion(), dual = new Quaternion(0, 0, 0, 0) ) {
		  
			this.isDualQuaternion = true;

			this.real = real;
			this.dual = dual;

	}

	static setFromRotation( q ) {

		return new DualQuaternion( q );

	}

	static setFromRotationTranslation( q, t ) {
		const w = -0.5 * ( t.x * q.x + t.y * q.y + t.z * q.z );
        const x =  0.5 * ( t.x * q.w + t.y * q.z - t.z * q.y );
        const y =  0.5 * (-t.x * q.z + t.y * q.w + t.z * q.x );
        const z =  0.5 * ( t.x * q.y - t.y * q.x + t.z * q.w );

		return new DualQuaternion( q , new Quaternion( x, y, z, w ) ).normalize();
	}

	static setFromTranslation( t ) {

		return DualQuaternion.setFromRotationTranslation ( new Quaternion(), t );

	}

	add( dq ) {

		this.real.add( dq.real );
		this.dual.add( dq.dual );

		return this;

	}

	addScaledDualQuaternion( dq, s ) {

		const tempQuat = dq.real.clone();
		this.real.add( tempQuat.multiplyScalar( s ) );

		tempQuat.copy( dq.dual );
		this.dual.add( tempQuat.multiplyScalar( s ));

		return this;

	}

	clone() {

		return new DualQuaternion( this.real.clone(), this.dual.clone() );

	}

	copy( dq ) {

		this.real.copy(dq.real);
		this.dual.copy(dq.dual);

		return this;

	}

	conjugate() {

		this.real.conjugate();
		this.dual.conjugate();

		return this;

	}

	dot( dq ) {

		return this.real.dot( dq.real );

	}

	equals( dq ) {

		return ( this.real.equals( dq.real ) && this.dual.equals( dq.dual ));

	}

	getRotation() {

		return this.real.clone();

	}

	getTranslation() {

		const t = this.dual.clone().multiplyScalar(2);
		t.multiply(this.real.clone().conjugate());

		return t.vector();

	}

	identity() {

		this.real.set( 0, 0, 0, 1 );
		this.dual.set( 0, 0, 0, 0 );

		return this;

	}

	invert() {
		
		const lenSq = this.lengthSq();

		this.real.conjugate().multiplyScalar( 1 / lenSq );
		this.dual.conjugate().multiplyScalar( 1 / lenSq );

		return this;

	}

	length() {

		return this.real.length();

	}

	lengthSq() {

		return this.real.lengthSq();

	}

	lerp( dq, t ) {

		this.real.multiplyScalar(t).add(dq.real.clone().multiplyScalar(1 - t));
		this.dual.multiplyScalar(t).add(dq.dual.clone().multiplyScalar(1 - t));

		return this;

	}

	lerpShortest( dq, t ) {
		const dqTemp = dq.clone();

		if(this.real.dot(dqTemp.real) < 0)
			dqTemp.multiplyScalar(-1);

		this.real.multiplyScalar(t).add(dqTemp.real.multiplyScalar(1 - t));
		this.dual.multiplyScalar(t).add(dqTemp.dual.multiplyScalar(1 - t));

		return this;

	}

	lerpDualQuaternions( dq0, dq1, t) {

		this.copy(dq0);
		this.lerp(dq1, t);

		return this;

	}

	lerpDualQuaternionsShortest( dq0, dq1, t) {

		this.copy(dq0);
		this.lerpShortest(dq1, t);

		return this;

	}

	multiplyDualQuaternions( dq0, dq1 ) {

		const tempReal = dq0.real.clone().multiply( dq1.real );

		const tempDual = dq0.dual.clone().multiply( dq1.real );
		tempDual.add( dq0.real.clone().multiply( dq1.dual ));

		this.real.copy(tempReal);
		this.dual.copy(tempDual);

		return this;

	}

	multiply( dq ) {

		this.multiplyDualQuaternions( this, dq );

		return this;

	}

	multiplyScalar( s ) {

		this.real.multiplyScalar( s );
		this.dual.multiplyScalar( s );

		return this;

	}

	normalize() {

		const norm = this.real.length();

		this.real.multiplyScalar( 1 / norm );
		this.dual.multiplyScalar( 1 / norm );

		return this;

	}

	transform( p ) {
		const norm = this.length();
		const qr = this.real.clone().multiplyScalar( 1 / norm );
	
		const trans = this.getTranslation();

		const transP = p.clone();
		transP.applyQuaternion(qr);
		transP.add(trans);

		return transP;
		
	}

	// _onChange( callback ) {

	// 	this._onChangeCallback = callback;

	// 	return this;

	// }

	// _onChangeCallback() {}
}

export {DualQuaternion}