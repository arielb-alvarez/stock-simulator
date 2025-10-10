// services/drawingService.ts
import { UTCTimestamp } from 'lightweight-charts';
import { Drawing, CandleStickData } from '../types';

export interface Coordinate {
  x: number;
  y: number;
}

export interface Point {
  time: number;
  price: number;
}

export interface DrawingValidationResult {
  isValid: boolean;
  coordinates?: Coordinate[];
  error?: string;
}

export class DrawingService {
  // Time normalization
  static normalizeTime(time: any): UTCTimestamp {
    if (typeof time === 'number') {
      return time > 10000000000 ? Math.floor(time / 1000) as UTCTimestamp : time as UTCTimestamp;
    }
    if (typeof time === 'string') {
      return Math.floor(new Date(time).getTime() / 1000) as UTCTimestamp;
    }
    return Math.floor(Date.now() / 1000) as UTCTimestamp;
  }

  // Coordinate conversion helpers
  static validateAndConvertPoint(
    x: number,
    y: number,
    chart: any,
    series: any
  ): Point | null {
    if (!chart || !series) return null;
    
    try {
      const time = chart.timeScale().coordinateToTime(x);
      if (time === null) return null;
      
      const price = series.coordinateToPrice(y);
      if (price === null || isNaN(price)) return null;

      const normalizedTime = this.normalizeTime(time);
      
      return { 
        time: normalizedTime, 
        price 
      };
    } catch (error) {
      console.error('Error converting coordinates:', error);
      return null;
    }
  }

  static safeTimeToCoordinate(time: number, chart: any): number | null {
    if (!chart?.timeScale()) return null;
    
    try {
      const chartTime = time as UTCTimestamp;
      const coord = chart.timeScale().timeToCoordinate(chartTime);
      
      if (coord === null || isNaN(coord) || !isFinite(coord)) {
        return null;
      }
      
      const roundedCoord = Math.round(coord);
      return roundedCoord;
    } catch (error) {
      console.warn('Error converting time to coordinate:', time, error);
      return null;
    }
  }

  static priceToCoordinate(price: number, series: any): number | null {
    if (!series) return null;
    
    try {
      const coord = series.priceToCoordinate(price);
      if (coord === null || isNaN(coord) || !isFinite(coord)) {
        return null;
      }
      
      const roundedCoord = Math.round(coord);
      return roundedCoord;
    } catch (error) {
      console.warn('Error converting price to coordinate:', price, error);
      return null;
    }
  }

  // Hit detection functions
  static isPointNearLine(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number,
    tolerance: number
  ): boolean {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  static isPointNearRectangle(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number,
    tolerance: number
  ): boolean {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    const expandedMinX = minX - tolerance;
    const expandedMaxX = maxX + tolerance;
    const expandedMinY = minY - tolerance;
    const expandedMaxY = maxY + tolerance;

    return px >= expandedMinX && px <= expandedMaxX && 
            py >= expandedMinY && py <= expandedMaxY;
  }

  static isPointNearCircle(
    px: number, py: number,
    cx: number, cy: number,
    radius: number,
    tolerance: number
  ): boolean {
    const distance = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
    return Math.abs(distance - radius) <= tolerance;
  }

  // Drawing validation and processing
  static validateDrawing(
    drawing: Drawing,
    chart: any,
    series: any,
    chartDimensions: { width: number; height: number }
  ): DrawingValidationResult {
    if (!drawing.points || drawing.points.length === 0) {
      return { isValid: false, error: 'No points in drawing' };
    }

    try {
      const coordinates: Coordinate[] = [];
      let validPoints = 0;
      
      for (const point of drawing.points) {
        const x = this.safeTimeToCoordinate(point.time, chart);
        const y = this.priceToCoordinate(point.price, series);
        
        if (x !== null && y !== null) {
          coordinates.push({ x, y });
          validPoints++;
        }
      }

      // For non-freehand drawings, we need all required points
      if (drawing.type !== 'freehand') {
        const requiredPoints = drawing.type === 'line' ? 2 : 2;
        if (validPoints < requiredPoints) {
          return { isValid: false, error: `Insufficient valid points for ${drawing.type}` };
        }
      }

      if (validPoints === 0) {
        return { isValid: false, error: 'No valid coordinates found' };
      }

      return { isValid: true, coordinates };
    } catch (error) {
      return { isValid: false, error: `Validation error: ${error}` };
    }
  }

  // Drawing creation utilities
  static createNewDrawing(
    type: string,
    startPoint: Point,
    color: string,
    width: number
  ): Drawing {
    return {
      id: `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      points: [{ time: startPoint.time, price: startPoint.price }],
      color,
      width,
      createdAt: this.normalizeTime(Date.now())
    };
  }

  static updateDrawingPoints(
    drawing: Drawing,
    newPoint: Point,
    isFreehand: boolean = false
  ): Drawing {
    if (isFreehand) {
      return {
        ...drawing,
        points: [...drawing.points, { time: newPoint.time, price: newPoint.price }]
      };
    } else {
      return {
        ...drawing,
        points: drawing.points.length === 1 
          ? [...drawing.points, { time: newPoint.time, price: newPoint.price }]
          : [drawing.points[0], { time: newPoint.time, price: newPoint.price }]
      };
    }
  }

  // SVG Path generation
  static generateSVGPath(points: Coordinate[]): string {
    return points.map(coord => `${coord.x},${coord.y}`).join(' ');
  }

  // Find drawings for eraser
  static findDrawingsToRemove(
    point: Point,
    screenX: number,
    screenY: number,
    drawings: Drawing[],
    chart: any,
    series: any,
    tolerance: number = 15
  ): string[] {
    const drawingsToRemove: string[] = [];
    
    drawings.forEach(drawing => {
      let shouldRemove = false;
      const validation = this.validateDrawing(drawing, chart, series, { width: 0, height: 0 });

      if (!validation.isValid || !validation.coordinates) return;

      switch (drawing.type) {
        case 'freehand':
          shouldRemove = validation.coordinates.some(coord => 
            Math.abs(coord.x - screenX) < tolerance && Math.abs(coord.y - screenY) < tolerance
          );
          break;

        case 'line':
          if (validation.coordinates.length === 2) {
            const [p1, p2] = validation.coordinates;
            shouldRemove = this.isPointNearLine(screenX, screenY, p1.x, p1.y, p2.x, p2.y, tolerance);
          }
          break;

        case 'rectangle':
          if (validation.coordinates.length === 2) {
            const [p1, p2] = validation.coordinates;
            shouldRemove = this.isPointNearRectangle(screenX, screenY, p1.x, p1.y, p2.x, p2.y, tolerance);
          }
          break;

        case 'circle':
          if (validation.coordinates.length === 2) {
            const [center, edge] = validation.coordinates;
            const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
            shouldRemove = this.isPointNearCircle(screenX, screenY, center.x, center.y, radius, tolerance);
          }
          break;
      }

      if (shouldRemove) {
        drawingsToRemove.push(drawing.id);
      }
    });

    return drawingsToRemove;
  }
}

export default DrawingService;