import TiledPixiTrack from './TiledPixiTrack';

// Services
import { tileProxy } from './services';
import { create } from './services/pub-sub';

// Utils
import { colorToHex } from './utils';

class ArrowheadDomainsTrack extends TiledPixiTrack {
  constructor(scene, dataConfig, handleTilesetInfoReceived, option, animate) {
    super(scene, dataConfig, handleTilesetInfoReceived, option, animate);

    this.drawnRects = {};

    // Create a custom pubSub interface
    const { publish, subscribe, unsubscribe } = create({});
    this.publish = publish;
    this.subscribe = subscribe;
    this.unsubscribe = unsubscribe;
  }

  /*
   * The local tile identifier
   */
  tileToLocalId(tile) {
    // tile contains [zoomLevel, xPos, yPos]
    return `${tile.join('.')}`;
  }

  /**
   * The tile identifier used on the server
   */
  tileToRemoteId(tile) {
    // tile contains [zoomLevel, xPos, yPos]
    return `${tile.join('.')}`;
  }

  localToRemoteId(remoteId) {
    const idParts = remoteId.split('.');
    return idParts.slice(0, idParts.length - 1).join('.');
  }

  calculateZoomLevel() {
    const xZoomLevel = tileProxy.calculateZoomLevel(
      this._xScale,
      this.tilesetInfo.min_pos[0],
      this.tilesetInfo.max_pos[0]
    );
    const yZoomLevel = tileProxy.calculateZoomLevel(
      this._xScale,
      this.tilesetInfo.min_pos[1],
      this.tilesetInfo.max_pos[1]
    );

    let zoomLevel = Math.max(xZoomLevel, yZoomLevel);
    zoomLevel = Math.min(zoomLevel, this.maxZoom);

    return zoomLevel;
  }

  /**
   * Set which tiles are visible right now.
   *
   * @param tiles: A set of tiles which will be considered the currently visible
   * tile positions.
   */
  setVisibleTiles(tilePositions) {
    this.visibleTiles = tilePositions.map(x => ({
      tileId: this.tileToLocalId(x),
      remoteId: this.tileToRemoteId(x),
    }));

    this.visibleTileIds = new Set(this.visibleTiles.map(x => x.remoteId));
  }

  calculateVisibleTiles() {
    // if we don't know anything about this dataset, no point
    // in trying to get tiles
    if (!this.tilesetInfo) { return; }

    this.zoomLevel = this.calculateZoomLevel();
    // this.zoomLevel = 0;

    this.xTiles = tileProxy.calculateTiles(
      this.zoomLevel,
      this._xScale,
      this.tilesetInfo.min_pos[0],
      this.tilesetInfo.max_pos[0],
      this.tilesetInfo.max_zoom,
      this.tilesetInfo.max_width
    );

    this.yTiles = tileProxy.calculateTiles(
      this.zoomLevel,
      this._yScale,
      this.tilesetInfo.min_pos[1],
      this.tilesetInfo.max_pos[1],
      this.tilesetInfo.max_zoom,
      this.tilesetInfo.max_width
    );

    const rows = this.xTiles;
    const cols = this.yTiles;
    const zoomLevel = this.zoomLevel;

    // if we're mirroring tiles, then we only need tiles along the diagonal
    const tiles = [];

    // calculate the ids of the tiles that should be visible
    for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < cols.length; j++) {
        const newTile = [zoomLevel, rows[i], cols[j]];

        tiles.push(newTile);
      }
    }

    this.setVisibleTiles(tiles);
  }

  /**
   * Create whatever is needed to draw this tile.
   */
  initTile(/* tile */) {
    // this.drawTile(tile);
  }

  destroyTile() {
    // Nothing
  }

  draw() {
    this.drawnRects = {};

    super.draw();
  }

  drawTile(tile) {
    const graphics = tile.graphics;

    if (!graphics) { return; }

    graphics.clear();

    const stroke = colorToHex(this.options.rectangleDomainStrokeColor || 'black');
    const fill = colorToHex(this.options.rectangleDomainFillColor || 'grey');

    graphics.lineStyle(
      typeof this.options.rectangleDomainStrokeWidth !== 'undefined'
        ? this.options.rectangleDomainStrokeWidth
        : 1,
      stroke,
      typeof this.options.rectangleDomainStrokeOpacity !== 'undefined'
        ? this.options.rectangleDomainStrokeOpacity
        : 1,
    );
    graphics.beginFill(
      fill,
      typeof this.options.rectangleDomainFillOpacity !== 'undefined'
        ? this.options.rectangleDomainFillOpacity
        : 0.4,
    );

    graphics.alpha = this.options.rectangleDomainOpacity || 0.5;

    const minSquareSize = (
      this.options.minSquareSize
      && this.options.minSquareSize !== 'none'
    )
      ? +this.options.minSquareSize
      : 0;

    const minThres = this.options.rectanlgeMinSize
      ? +this.options.rectanlgeMinSize
      : 0;

    const xMin = this._xScale.range()[0];
    const xMax = this._xScale.range()[1];
    const yMin = this._yScale.range()[0];
    const yMax = this._yScale.range()[1];

    if (!tile.tileData.length) return;

    // line needs to be scaled down so that it doesn't become huge
    for (const td of tile.tileData) {
      const startX = this._xScale(td.xStart);
      const endX = this._xScale(td.xEnd);

      const startY = this._yScale(td.yStart);
      const endY = this._yScale(td.yEnd);

      const uid = td.uid;

      const width = endX - startX;
      const height = endY - startY;

      // we've already drawn this rectangle in another tile
      if (uid in this.drawnRects) continue;

      let drawnRect = {
        x: startX,
        y: startY,
        width,
        height
      };

      if (minSquareSize) {
        if (width < minSquareSize || height < minSquareSize) {
          drawnRect = {
            x: startX - (minSquareSize / 2),
            y: startY - (minSquareSize / 2),
            width: minSquareSize,
            height: minSquareSize
          };
        }
      }

      this.drawnRects[uid] = drawnRect;

      const dRxMax = drawnRect.x + drawnRect.width;
      const dRyMax = drawnRect.y + drawnRect.height;

      // Only draw annotations that falls somehow within the viewport
      if (
        (drawnRect.x > xMin && drawnRect.x < xMax) ||
        (dRxMax > xMin && dRxMax < xMax) ||
        (drawnRect.y > yMin && drawnRect.y < yMax) ||
        (dRyMax > yMin && dRyMax < yMax)
      ) {
        if (drawnRect.width > minThres || drawnRect.height > minThres) {
          graphics.drawRect(
            drawnRect.x, drawnRect.y, drawnRect.width, drawnRect.height
          );

          this.publish('annotationDrawn', {
            uid,
            viewPos: [drawnRect.x, drawnRect.y, drawnRect.width, drawnRect.height],
            dataPos: [td.xStart, td.xEnd, td.yStart, td.yEnd]
          });
        }
      }
    }
  }

  exportSVG() {
    let track = null;
    let base = null;

    if (super.exportSVG) {
      [base, track] = super.exportSVG();
    } else {
      base = document.createElement('g');
      track = base;
    }
    const output = document.createElement('g');
    output.setAttribute('transform',
      `translate(${this.position[0]},${this.position[1]})`);

    track.appendChild(output);

    for (let tile of this.visibleAndFetchedTiles()) {
      // this tile has no data
      if (!tile.tileData || !tile.tileData.length) continue;

      tile.tileData.forEach((td) => {
        const gTile = document.createElement('g');
        gTile.setAttribute('transform',
          `translate(${tile.graphics.position.x},${tile.graphics.position.y})scale(${tile.graphics.scale.x},${tile.graphics.scale.y})`);
        output.appendChild(gTile);

        if (td.uid in this.drawnRects) {
          const rect = this.drawnRects[td.uid];

          const r = document.createElement('rect');
          r.setAttribute('x', rect.x);
          r.setAttribute('y', rect.y);
          r.setAttribute('width', rect.width);
          r.setAttribute('height', rect.height);

          r.setAttribute(
            'fill', this.options.fillColor ? this.options.fillColor : 'grey'
          );
          r.setAttribute('opacity', 0.3);

          r.style.stroke = this.options.fillColor
            ? this.options.fillColor
            : 'grey';
          r.style.strokeWidth = '1px';

          gTile.appendChild(r);
        }
      });
    }

    return [base, base];
  }

  setPosition(newPosition) {
    super.setPosition(newPosition);

    this.pMain.position.y = this.position[1];
    this.pMain.position.x = this.position[0];
  }

  zoomed(newXScale, newYScale) {
    if (
      this.xScale().domain()[0] === newXScale.domain()[0] &&
      this.xScale().domain()[1] === newXScale.domain()[1] &&
      this.yScale().domain()[0] === newYScale.domain()[0] &&
      this.yScale().domain()[1] === newYScale.domain()[1]
    ) return;

    this.xScale(newXScale);
    this.yScale(newYScale);

    this.refreshTiles();

    this.draw();
  }
}

export default ArrowheadDomainsTrack;
