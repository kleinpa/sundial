import React, { useEffect, useState } from "react";
import "./App.scss";
import suncalc from "suncalc";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface SundialInfo {
  dayPercent: number;
  dawnPercent: number;
  duskPercent: number;
  sunAngle: number;
}

const msInDay = 24 * 60 * 60 * 1000;

function angleToIllumination(angle: number) {
  return Math.min(1, Math.max(0, (angle / 6 + 1) / 2));
}

function sunAngleToColor(a: number) {
  const illum = angleToIllumination(a);
  const night = [20, 15, 97];
  const day = [252, 223, 3];
  return {
    r: illum * day[0] + (1 - illum) * night[0],
    g: illum * day[1] + (1 - illum) * night[1],
    b: illum * day[2] + (1 - illum) * night[2],
  };
}

function sunAngleSlices(location: Coordinates, date: Date, slices = 72) {
  // Divide day into slices and calculate the angle of the sun during each
  const xs = [];
  for (let i = 0; i < slices; i++) {
    const t = new Date(date.getTime() + ((i + 0.5) / slices) * msInDay);
    const p = suncalc.getPosition(
      t,
      location.latitude || 0,
      location.longitude || 0
    );
    xs.push((p.altitude / Math.PI) * 180);
  }
  return xs;
}

interface SundialDisplayProps {
  info: SundialInfo;
  illumination: number[];
}
function SundialDisplay(props: SundialDisplayProps) {
  // overall size
  const circle = {
    x: 50,
    y: 50,
    r: 45,
  };

  function Section(props: {
    r0: number; // revs
    r1: number; // revs
    a0: number;
    a1: number;
    fill: string;
  }) {
    const { r0: r0, r1: r1, a0: a0, a1: a1, ...rest } = props;

    // The four 'corners' of this secton
    function polar(a = 0, r = 0) {
      return {
        x: Math.sin(a * Math.PI * 2) * r,
        y: -Math.cos(a * Math.PI * 2) * r,
      };
    }
    const a0r0 = polar(a0, r0);
    const a1r0 = polar(a1, r0);
    const a0r1 = polar(a0, r1);
    const a1r1 = polar(a1, r1);

    const large = a1 - a0 >= Math.PI ? "1" : "0";
    return (
      <path
        d={
          `M ${circle.x + a1r0.x} ${circle.y + a1r0.y}` +
          `A ${r0} ${r0} 0 ${large} 0` +
          ` ${circle.x + a0r0.x} ${circle.y + a0r0.y} ` +
          `L ${circle.x + a0r1.x} ${circle.y + a0r1.y}` +
          `A ${r1} ${r1} 0 ${large} 1` +
          ` ${circle.x + a1r1.x} ${circle.y + a1r1.y} ` +
          `Z`
        }
        {...rest}
      />
    );
  }
  const slices = props.illumination;

  interface PolarTransformProps {
    r: number; // revs
    a: number;
  }
  // Position an object at a position around the circle
  function PolarTransform(props: React.PropsWithChildren<PolarTransformProps>) {
    return (
      <g
        transform={
          `rotate(${props.a * 360} ${circle.x} ${circle.y})` +
          `translate(${circle.x} ${circle.y - props.r})`
        }
      >
        {props.children}
      </g>
    );
  }

  const faceStroke = `currentColor`;
  const rgb = sunAngleToColor((props.info.sunAngle * 180) / Math.PI);
  return (
    <svg viewBox="0 0 100 100" className="SundialDisplay">
      <g shapeRendering="crispEdges" clipPath="circle(50%)">
        {slices.map((v, i) => {
          const rgb = sunAngleToColor(v);
          return (
            <Section
              r0={0}
              r1={circle.r}
              a0={(1 / slices.length) * i}
              a1={(1 / slices.length) * (i + 1)}
              fill={`rgb(${rgb.r},${rgb.g},${rgb.b})`}
              key={i}
            />
          );
        })}
      </g>
      <PolarTransform a={props.info.dayPercent + 4 / 24} r={circle.r}>
        <circle r=".5" fill={faceStroke} />
      </PolarTransform>
      <PolarTransform a={props.info.dayPercent + 8 / 24} r={circle.r}>
        <circle r=".5" fill={faceStroke} />
      </PolarTransform>
      <PolarTransform a={0} r={circle.r}>
        <line y1={-3} stroke={faceStroke} />
      </PolarTransform>
      <PolarTransform a={props.info.duskPercent} r={circle.r}>
        <line y1={-3} stroke={faceStroke} />
      </PolarTransform>
      <PolarTransform a={props.info.dawnPercent} r={circle.r}>
        <line y1={-3} stroke={faceStroke} />
      </PolarTransform>
      <PolarTransform a={props.info.dayPercent} r={circle.r}>
        <circle
          r="2"
          fill={`rgb(${rgb.r},${rgb.g},${rgb.b})`}
          stroke={faceStroke}
        />
      </PolarTransform>
    </svg>
  );
}
interface SundialProps {
  // Date as milliseconds since UNIX epoch
  date: number;

  location: Coordinates;
}
export function Sundial(props: SundialProps) {
  const times = suncalc.getTimes(
    new Date(props.date),
    props.location.latitude,
    props.location.longitude
  );
  const dayPercent =
    ((props.date - times.solarNoon.getTime()) / msInDay + 1) % 1;
  // sun percentage is the time between civil dawn and dusk as percentage of day

  const dawnPercent =
    (times.dawn.getTime() - times.solarNoon.getTime() + 1) / msInDay;
  const duskPercent =
    (times.dusk.getTime() - times.solarNoon.getTime()) / msInDay;
  const sunAngle = suncalc.getPosition(
    new Date(props.date),
    props.location.latitude,
    props.location.longitude
  ).altitude;
  const info = {
    dayPercent: dayPercent,
    dawnPercent: dawnPercent,
    duskPercent: duskPercent,
    sunAngle: sunAngle,
  };
  const slices = sunAngleSlices(props.location, times.solarNoon);

  return (
    <div className="App">
      <SundialDisplay info={info} illumination={slices} />
    </div>
  );
}
export default function App() {
  const [date, setDate] = useState<number>(Date.now());
  const [location, setLocation] = useState<Coordinates | undefined>(undefined);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation(pos.coords),
      () => setLocation(undefined)
    );

    const interval = setInterval(() => setDate(Date.now()), 1000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(interval);
    };
  }, []);
  if (location === undefined) {
    return <div>waiting for location</div>;
  }

  return <Sundial location={location} date={date} />;
}
