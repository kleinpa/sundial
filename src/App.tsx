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
  interface SemicircleProps {
    cx: number;
    cy: number;
    r: number;
    a1: number;
    a2: number;

    fill: string;
  }
  function Semicircle(props: SemicircleProps) {
    const { cx, cy, r, a1, a2, ...rest } = props;
    const a1x = cx + Math.sin(a1) * r;
    const a1y = cy - Math.cos(a1) * r;
    const a2x = cx + Math.sin(a2) * r;
    const a2y = cy - Math.cos(a2) * r;
    const large = a2 - a1 >= Math.PI ? "1" : "0";
    const full = a2 - a1 >= Math.PI * 2;
    if (full) {
      return <circle cx={cx} cy={cy} r={r} {...rest} />;
    }
    return (
      <path
        d={
          `M ${cx} ${cy}` +
          `L ${a1x} ${a1y}` +
          `A ${r} ${r} 0 ${large} 1 ${a2x} ${a2y} ` +
          `Z`
        }
        {...rest}
      />
    );
  }
  const slices = props.illumination;
  const sliceAngle = (Math.PI * 2) / slices.length;

  const cx = 50;
  const cy = 50;
  const r = 45;

  const face = slices.map((v, i) => {
    const rgb = sunAngleToColor(v);
    return (
      <Semicircle
        cx={cx}
        cy={cy}
        r={r}
        a1={sliceAngle * i}
        a2={sliceAngle * (i + 1)}
        //a2={Math.PI * 2}
        fill={`rgb(${rgb.r},${rgb.g},${rgb.b})`}
        key={i}
      />
    );
  });

  const nowa = props.info.dayPercent * 2 * Math.PI;
  const nowx = cx + Math.sin(nowa) * r;
  const nowy = cy - Math.cos(nowa) * r;
  const faceStroke = `currentColor`;
  const rgb = sunAngleToColor((props.info.sunAngle * 180) / Math.PI);
  return (
    <svg viewBox="0 0 100 100" className="Dial">
      <g shapeRendering="crispEdges" clipPath="circle(50%)">
        {face}
      </g>
      <rect
        x={cx - 0.5}
        y={cy - r - 3}
        height={3}
        width={1}
        transform={`rotate(${props.info.dawnPercent * 360} ${cx} ${cy})`}
        fill={faceStroke}
      />
      <rect
        x={cx - 0.5}
        y={cy - r - 3}
        height={3}
        width={1}
        transform={`rotate(${props.info.duskPercent * 360} ${cx} ${cy})`}
        fill={faceStroke}
      />
      <rect
        x={cx - 0.5}
        y={cy - r - 3}
        height={3}
        width={1}
        transform={`rotate(${0 * 360} ${cx} ${cy})`}
        fill={faceStroke}
      />
      {/* <circle cx={cx} cy={cy} r={r} stroke={faceStroke} fill="none" /> */}
      <circle
        cx={nowx}
        cy={nowy}
        r="2"
        fill={`rgb(${rgb.r},${rgb.g},${rgb.b})`}
        stroke={faceStroke}
      />
    </svg>
  );
}
export default function App(): JSX.Element {
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

  const times = suncalc.getTimes(
    new Date(date),
    location.latitude,
    location.longitude
  );
  const dayPercent = ((date - times.solarNoon.getTime()) / msInDay + 1) % 1;
  // sun percentage is the time between civil dawn and dusk as percentage of day

  const dawnPercent =
    (times.dawn.getTime() - times.solarNoon.getTime() + 1) / msInDay;
  const duskPercent =
    (times.dusk.getTime() - times.solarNoon.getTime()) / msInDay;
  const sunAngle = suncalc.getPosition(
    new Date(date),
    location.latitude,
    location.longitude
  ).altitude;
  const info = {
    dayPercent: dayPercent,
    dawnPercent: dawnPercent,
    duskPercent: duskPercent,
    sunAngle: sunAngle,
  };
  const slices = sunAngleSlices(location, times.solarNoon);

  return (
    <div className="App">
      <SundialDisplay info={info} illumination={slices} />
    </div>
  );
}
