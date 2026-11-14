/** Plain-language panel for students and the public. */
export default function Explain() {
  return (
    <details className="panel explain">
      <summary>New to this? How to read the page</summary>
      <div className="explain-body">
        <p>
          <b>Why the south pole is tricky.</b> Near the Moon's south pole the Sun never climbs high. It circles around
          the horizon, only a few degrees up. A crater rim or a mountain can hide it for days, so moving a few
          kilometres can be the difference between steady solar power and a long, cold night.
        </p>
        <p>
          <b>Why Earth matters.</b> Astronauts and landers talk to Earth by radio, which needs a straight line of sight.
          From the Moon, Earth barely moves in the sky: it just wobbles a little. At the pole it sits right on the
          horizon, so some places see Earth half the month and others never do.
        </p>
        <p>
          <b>The sky dome.</b> Imagine lying on your back looking up. The centre is straight overhead and the edge is
          the horizon, with north at the top. The brown band is the real terrain, measured by NASA's LRO spacecraft
          laser (LOLA). The orange line is the Sun's path and the blue line is Earth's. Solid means you can see it;
          dotted means it's behind the terrain.
        </p>
        <p>
          <b>Terrain vs flat horizon.</b> "Flat" pretends the ground is a perfect ball. "Terrain" uses real hills and
          craters. Flip between them to see how much the landscape changes the answer. On a peak, terrain can even
          <i> add</i> time, because you can see past the flat horizon. There is no air on the Moon, so nothing bends the
          light.
        </p>
        <p>
          <b>The numbers.</b> <i>% sunlit</i> is power. <i>Longest dark</i> sets how big the batteries must be.
          <i> % Earth in view</i> and <i>longest blackout</i> are about radio contact. The best landing time has both
          the Sun and Earth up.
        </p>
        <p>
          <b>Why a mast helps.</b> Near the pole the Sun skims the horizon, so a few metres of height lets solar panels
          and antennas see over nearby rocks and rims. Switch to the 10 m mast to see how much longer the lights and the
          radio stay on.
        </p>
      </div>
    </details>
  );
}
