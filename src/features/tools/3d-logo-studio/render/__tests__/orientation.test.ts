import { describe, expect, it } from 'vitest';
import { buildMesh } from '../../engine/buildMesh';
import { createDocument, type GeometryMode } from '../../engine/document';
import { toBufferGeometry, normalizeToUnitSize } from '../geometry';

describe('SVG to 3D handedness', () => {
  it.each(['sphere', 'inflate', 'extrude', 'revolve'] as GeometryMode[])('%s renders outward after normalization', mode => {
    const ring = Float64Array.from(Array.from({length: 96}, (_, i) => {
      const a = i / 96 * 2 * Math.PI; return [30 + Math.cos(a)*10, 30 + Math.sin(a)*10];
    }).flat());
    const doc = createDocument({svg:'<svg/>',fileName:'disc.svg',components:[{id:'disc',rings:[ring],fillRule:'nonzero'}]});
    doc.geometry = {...doc.geometry, mode};
    const mesh = buildMesh(doc).mesh;
    const original = mesh.positions.slice();
    const {geometry} = toBufferGeometry(mesh);
    normalizeToUnitSize(geometry);
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), index = geometry.index!;
    let volume = 0, agreement = 0, triangles = 0;
    for (let i=0;i<index.count;i+=3) {
      const a=index.getX(i), b=index.getX(i+1), c=index.getX(i+2);
      const ax=p.getX(a), ay=p.getY(a), az=p.getZ(a);
      const bx=p.getX(b), by=p.getY(b), bz=p.getZ(b);
      const cx=p.getX(c), cy=p.getY(c), cz=p.getZ(c);
      volume += (ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;
      const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      if(Math.hypot(nx,ny,nz)<1e-10) continue;
      const dot=nx*(n.getX(a)+n.getX(b)+n.getX(c))+ny*(n.getY(a)+n.getY(b)+n.getY(c))+nz*(n.getZ(a)+n.getZ(b)+n.getZ(c));
      if(dot>0) agreement++;
      triangles++;
    }
    expect(volume).toBeGreaterThan(0);
    expect(agreement/triangles).toBeGreaterThan(0.99);
    expect(mesh.positions).toEqual(original);
    geometry.dispose();
  });
});
