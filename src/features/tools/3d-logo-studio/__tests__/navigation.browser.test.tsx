import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Mesh, OrthographicCamera } from 'three';
import { Viewport } from '../components/Viewport';
import { createDocument, setCamera, setDefaultMaterial, type Studio3dDocument } from '../engine/document';
import { buildMesh } from '../engine/buildMesh';
import { toBufferGeometry, normalizeToUnitSize } from '../render/geometry';
import type { Studio } from '../render/studio';
import '../studio3d.css';

function documentFixture() {
  const rings = [Float64Array.from(Array.from({length: 64}, (_, i) => {
    const a = i / 64 * Math.PI * 2; return [20 + 10 * Math.cos(a), 20 + 10 * Math.sin(a)];
  }).flat())];
  const doc = createDocument({svg: '<svg/>', fileName: 'circle.svg', components: [{id: 'circle', rings, fillRule: 'nonzero'}]});
  doc.geometry = {...doc.geometry, mode: 'sphere'};
  doc.materials = {...doc.materials, defaultId: 'polished-chrome'};
  return doc;
}

afterEach(() => { cleanup(); document.body.innerHTML = ''; });

function mount() {
  const initial = documentFixture();
  const mesh = buildMesh(initial).mesh;
  let studio: Studio;
  let current = initial;
  let update: (doc: Studio3dDocument) => void;
  function Harness() {
    const [doc, setDoc] = useState(initial);
    current = doc; update = setDoc;
    return <div data-workspace="" style={{width: 640, height: 480}}>
      <div style={{height: 480, display: 'grid'}}><Viewport doc={doc} mesh={mesh}
        onReady={s => {studio = s;}} onCameraChange={camera => setDoc(d => setCamera(d, camera))}/></div>
    </div>;
  }
  const result = render(<Harness/>);
  return {...result, mesh, get studio(){return studio!;}, get current(){return current;},
    change: (doc: Studio3dDocument) => act(() => update(doc))};
}

describe('interactive camera', () => {
  it('zooms, persists the view, and keeps geometry when appearance changes', async () => {
    const view = mount();
    const canvas = screen.getByLabelText('3D preview of the imported logo');
    await waitFor(() => expect(view.studio).toBeTruthy());
    const camera = view.studio.camera;
    const geometry = (view.studio.scene.children.find(c => c instanceof Mesh) as Mesh).geometry;
    fireEvent.wheel(canvas, {deltaY: -200, clientX: 320, clientY: 240});
    await waitFor(() => expect(view.current.camera.zoom).toBeGreaterThan(1));
    const zoom = camera.zoom;
    view.change(setDefaultMaterial(view.current, 'glossy-black'));
    await waitFor(() => expect(view.current.materials.defaultId).toBe('glossy-black'));
    expect(view.studio.camera).toBe(camera);
    expect(camera.zoom).toBe(zoom);
    expect((view.studio.scene.children.find(c => c instanceof Mesh) as Mesh).geometry).toBe(geometry);
    fireEvent.click(screen.getByRole('button', {name: 'Fit view'}));
    await waitFor(() => expect(view.studio.camera.zoom).toBe(1));
  });

  it('pans with focused keyboard controls, and survives projection replacement', async () => {
    const view = mount();
    const canvas = screen.getByLabelText('3D preview of the imported logo');
    await waitFor(() => expect(view.studio).toBeTruthy());
    fireEvent.keyDown(canvas, {code: 'ArrowRight'});
    fireEvent.keyUp(canvas, {code: 'ArrowRight'});
    await waitFor(() => expect(view.current.camera.target[0]).not.toBe(0));
    view.change(setCamera(view.current, {projection: 'perspective', zoom: undefined, frustumHeight: undefined}));
    await waitFor(() => expect(view.studio.camera instanceof OrthographicCamera).toBe(false));
    const before = view.studio.camera.position.length();
    fireEvent.wheel(canvas, {deltaY: -200, clientX: 320, clientY: 240});
    await waitFor(() => expect(view.studio.camera.position.length()).toBeLessThan(before));
  });

  it('preparing repeated previews never mutates source mesh buffers', () => {
    const mesh = buildMesh(documentFixture()).mesh;
    const positions = mesh.positions.slice(), normals = mesh.normals.slice(), indices = mesh.indices.slice();
    for (let i = 0; i < 2; i++) {
      const {geometry} = toBufferGeometry(mesh);
      normalizeToUnitSize(geometry);
      geometry.dispose();
    }
    expect(mesh.positions).toEqual(positions);
    expect(mesh.normals).toEqual(normals);
    expect(mesh.indices).toEqual(indices);
  });
});
