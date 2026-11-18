import { createProceduralHall } from './procedural-hall.js';
import { SpatialGenLoader } from './spatialgen.js';

export { createProceduralHall, SpatialGenLoader };

export async function buildEnvironment({ onSpatialGenProgress = () => {} } = {}) {
  const spatialLoader = new SpatialGenLoader();
  const configuredUrl = spatialLoader.getConfiguredUrl();

  if (configuredUrl) {
    try {
      const spatialHall = await spatialLoader.load(configuredUrl, onSpatialGenProgress);
      if (spatialHall) return spatialHall;
    } catch (error) {
      console.warn('[SpatialGen] 场景加载失败，回退到程序化展厅。', error);
    }
  }

  return createProceduralHall();
}
