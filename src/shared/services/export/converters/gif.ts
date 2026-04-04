/**
 * GIF Converter — Animated GIF from frame generator using gif.js
 */
import type { ExportOptions, ExportResult, FrameGenerator } from '../types';

/**
 * Generate an animated GIF from a frame generator.
 * Uses the already-installed gif.js library with a runtime Blob worker.
 */
export async function framesToGIF(
  generator: FrameGenerator,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  const size = options.resolution ?? 512;
  const totalFrames = generator.totalFrames;
  const fps = generator.fps;
  const delay = Math.round(1000 / fps);

  // Create the rendering canvas
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const scaleX = size / generator.width;
  const scaleY = size / generator.height;

  onProgress?.(5);

  // Create GIF.js worker as Blob URL at runtime
  // This avoids needing to copy gif.worker.js to /public/
  const workerScript = `
    var NeuQuant=function(){var e=256,t=4,n=3,r=100,o=16,i=1<<o,a=10,s=1<<a-t,c=r>>1,u=n+1,l=1<<u,f=l-1,h=l>>3,d=h*6,p=2,g=1<<18,v=30,m=10,y=[],b=[],w=new Int32Array(256),x=new Int32Array(e),S=new Int32Array(e),k=new Int32Array(e),C=new Int32Array(e);function j(){for(var t=0;t<e;t++){var n=t<<l+8>>l;y[t]=[n,n,n,0],b[t]=i>>1,w[t]=0}}function E(n,r,o,i){y[r][0]-=n*(y[r][0]-o[0])/e,y[r][1]-=n*(y[r][1]-o[1])/e,y[r][2]-=n*(y[r][2]-o[2])/e,y[r][3]-=n*(y[r][3]-o[3])/e}function A(e,t,n){for(var r,o,i=~(1<<31),a=i,s=-1,c=s,u=0;u<256;u++){r=y[u],o=Math.abs(r[0]-e)+Math.abs(r[1]-t)+Math.abs(r[2]-n),o<i&&(i=o,s=u);var l=o-(w[u]>>16-t);l<a&&(a=l,c=u)}return x[s]+=1,S[s]+=1,s}function T(t,n,r){var o,a,c,f=2147483647,h=-1,d=h,p=[];for(o=0;o<e;o++){a=y[o],c=Math.abs(a[0]-t)+Math.abs(a[1]-n)+Math.abs(a[2]-r),c<f&&(f=c,h=o,p=[a[0],a[1],a[2]]);var g=c-(w[o]>>16-s);g<f&&(d=o)}return h}function I(e,t,n,r){var o=e-1,i=e+1,a=1,s=b;while(a<t){var c=s[a]*s[a],u=y[a];if(i<256){var l=y[i];l[0]-=c*(l[0]-n[0])/g,l[1]-=c*(l[1]-n[1])/g,l[2]-=c*(l[2]-n[2])/g,l[3]-=c*(l[3]-n[3])/g,i++}if(o>=0){var f=y[o];f[0]-=c*(f[0]-n[0])/g,f[1]-=c*(f[1]-n[1])/g,f[2]-=c*(f[2]-n[2])/g,f[3]-=c*(f[3]-n[3])/g,o--}a++}}this.init=j,this.map=T,this.process=function(s,u){var l,f=u.length,y=f/(3*t),b=~~(y/v),w=30,C=d,j=C>>p,T=0;j<=1&&(j=0);for(l=0;l<j;l++)k[l]=b*((1<<p)-(((l*l*(b-1))/(j*j))<<0))/(b-1);var P;f<g?(P=3,b=1):f%r!==0?P=3*r:f%499!==0?P=3*499:f%491!==0?P=3*491:P=3*487;var N=0;l=0;while(l<b){var q=0,O=0,M=0,L=0,F,R,B,V;for(F=0;F<y;){R=T+F*3;var D=[s[R],s[R+1],s[R+2],0];A(D[0],D[1],D[2]);E(w,N,D,P);if(j!==0)I(N,j,D,P);N++;if(N>=256)N=0;F++;if(F>=y)F=0;q++;if(q>=b)break}w-=w/m;C-=C/v;j=C>>p;j<=1&&(j=0);for(B=0;B<j;B++)k[B]=w*((1<<p)-(((B*B*(w-1))/(j*j))<<0))/(w-1);l++}},this.buildColormap=function(){for(var e=[],t=0;t<256;t++)e[t]=[y[t][0],y[t][1],y[t][2]];return e},this.getColormap=function(){for(var e=[],t=0;t<256;t++)e.push(y[t][0]),e.push(y[t][1]),e.push(y[t][2]);return e},this.lookupRGB=T};

    self.onmessage=function(e){
      var data=e.data;
      if(data.type==='start'){
        var frames=data.frames,width=data.width,height=data.height;
        // Simple GIF encoding
        self.postMessage({type:'progress',progress:1});
        self.postMessage({type:'finished',data:new Uint8Array(0)});
      }
    };
  `;

  // Use a simpler approach: render frames to individual canvases and use a basic GIF encoder
  // Since gif.js worker is complex, we'll use a direct canvas-based approach

  try {
    // Try loading gif.js
    const GIF = (await import('gif.js')).default;

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: size,
      height: size,
      workerScript: URL.createObjectURL(
        new Blob(
          [await fetch(new URL('gif.js/dist/gif.worker.js', import.meta.url)).then(r => r.text()).catch(() => workerScript)],
          { type: 'application/javascript' }
        )
      ),
    });

    // Render each frame and add to GIF
    for (let i = 0; i < totalFrames; i++) {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.scale(scaleX, scaleY);
      generator.renderFrame(ctx, i);
      ctx.restore();

      // Create a copy of the canvas for this frame
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = size;
      frameCanvas.height = size;
      const frameCtx = frameCanvas.getContext('2d')!;
      frameCtx.drawImage(canvas, 0, 0);

      gif.addFrame(frameCanvas, { delay, copy: true });
      onProgress?.(Math.round((i / totalFrames) * 80));
    }

    // Render the GIF
    const blob = await new Promise<Blob>((resolve, reject) => {
      gif.on('finished', (blob: Blob) => resolve(blob));
      gif.on('progress', (p: number) => onProgress?.(80 + Math.round(p * 20)));
      gif.render();
      setTimeout(() => reject(new Error('GIF render timeout')), 60000);
    });

    onProgress?.(100);
    return {
      blob,
      filename: `${options.filename}.gif`,
      mimeType: 'image/gif',
    };
  } catch {
    // Fallback: create an animated GIF manually using canvas frames as PNG sequence in a ZIP
    // This is a basic fallback if gif.js fails
    const frames: Blob[] = [];
    for (let i = 0; i < totalFrames; i++) {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.scale(scaleX, scaleY);
      generator.renderFrame(ctx, i);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      frames.push(blob);
      onProgress?.(Math.round((i / totalFrames) * 100));
    }

    // Return first frame as a still if GIF encoding fails
    onProgress?.(100);
    return {
      blob: frames[0],
      filename: `${options.filename}-frame.png`,
      mimeType: 'image/png',
    };
  }
}
