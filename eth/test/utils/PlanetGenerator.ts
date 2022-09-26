import { LOCATION_ID_UB_KECCACK, MAX_PLANET_LEVEL, MIN_PLANET_LEVEL } from '@dfdao/constants';
import { getBytesFromHex } from '@dfdao/hexgen';
import { perlin, PerlinConfig } from '@dfdao/procgen-utils';
import { locationIdFromHexStrKeccack } from '@dfdao/serde';
import { Initializers } from '@dfdao/settings';
import {
  LocationId,
  PlanetLevel,
  PlanetType,
  PlanetTypeNames,
  SpaceType,
  SpaceTypeNames,
} from '@dfdao/types';
import bigInt from 'big-integer';
import { ethers } from 'hardhat';

function spaceTypeFromPerlin(perlin: number, initializers: Initializers): SpaceType {
  if (perlin < initializers.PERLIN_THRESHOLD_1) {
    return SpaceType.NEBULA;
  } else if (perlin < initializers.PERLIN_THRESHOLD_2) {
    return SpaceType.SPACE;
  } else if (perlin < initializers.PERLIN_THRESHOLD_3) {
    return SpaceType.DEEP_SPACE;
  } else {
    return SpaceType.DEAD_SPACE;
  }
}

function planetLevelFromHexPerlin(
  hex: LocationId,
  perlin: number,
  initializers: Initializers
): PlanetLevel {
  const spaceType = spaceTypeFromPerlin(perlin, initializers);

  const levelBigInt = getBytesFromHex(hex, 4, 7);

  let ret = MIN_PLANET_LEVEL;

  for (let type = MAX_PLANET_LEVEL; type >= MIN_PLANET_LEVEL; type--) {
    if (levelBigInt < bigInt(initializers.PLANET_LEVEL_THRESHOLDS[type])) {
      ret = type;
      break;
    }
  }

  if (spaceType === SpaceType.NEBULA && ret > PlanetLevel.FOUR) {
    ret = PlanetLevel.FOUR;
  }
  if (spaceType === SpaceType.SPACE && ret > PlanetLevel.FIVE) {
    ret = PlanetLevel.FIVE;
  }
  if (ret > initializers.MAX_NATURAL_PLANET_LEVEL) {
    ret = initializers.MAX_NATURAL_PLANET_LEVEL as PlanetLevel;
  }

  return ret;
}

function planetTypeFromHexPerlin(
  hex: LocationId,
  perlin: number,
  initializers: Initializers
): PlanetType {
  // level must be sufficient - too low level planets have 0 silver growth
  const planetLevel = planetLevelFromHexPerlin(hex, perlin, initializers);

  const spaceType = spaceTypeFromPerlin(perlin, initializers);
  const weights = initializers.PLANET_TYPE_WEIGHTS[spaceType][planetLevel];
  const weightSum = weights.reduce((x, y) => x + y);
  let thresholds = [weightSum - weights[0]];
  for (let i = 1; i < weights.length; i++) {
    thresholds.push(thresholds[i - 1] - weights[i]);
  }
  thresholds = thresholds.map((x) => Math.floor((x * 256) / weightSum));
  const typeByte = Number(getBytesFromHex(hex, 8, 9));
  for (let i = 0; i < thresholds.length; i++) {
    if (typeByte >= thresholds[i]) {
      return i as PlanetType;
    }
  }
  // this should never happen
  return PlanetType.PLANET;
}

export function getPerlinConfig(initializers: Initializers): PerlinConfig {
  const perlinConfig: PerlinConfig = {
    seed: initializers.SPACETYPE_KEY,
    scale: initializers.PERLIN_LENGTH_SCALE,
    mirrorX: initializers.PERLIN_MIRROR_X,
    mirrorY: initializers.PERLIN_MIRROR_Y,
    floor: true,
  };
  return perlinConfig;
}

export function calcPlanetData(x: number, y: number, initializers: Initializers, verbose = false) {
  const location = ethers.utils.solidityKeccak256(['int32', 'int32'], [x, y]);

  // Ignore if hash is too high
  const threshold = LOCATION_ID_UB_KECCACK.divide(initializers.PLANET_RARITY);
  if (!bigInt(BigInt(location)).lesser(threshold)) {
    if (verbose) console.log(`hash of ${x},${y} too large > ${threshold}`);
    return;
  }

  const planetPerlin = perlin({ x, y }, getPerlinConfig(initializers));
  const locId = locationIdFromHexStrKeccack(location.slice(2));
  // Weird that locationIdFromHexStr can't handle 0x
  const level = planetLevelFromHexPerlin(locId, planetPerlin, initializers);
  const type = planetTypeFromHexPerlin(locId, planetPerlin, initializers);
  const spaceType = spaceTypeFromPerlin(planetPerlin, initializers);
  if (verbose)
    console.log(
      `// Level ${level} ${PlanetTypeNames[type]} SpaceType: ${SpaceTypeNames[spaceType]} Perlin: ${planetPerlin}\n {x: ${x}, y: ${y}},`
    );
  return { location, level, type, spaceType, planetPerlin };
}
// Will generate rounds^2 potential planets
export function generate(
  rounds: number,
  offset = 0,
  initializers: Initializers,
  verbose = false,
  coords?: { x: number; y: number }[]
) {
  if (coords && coords.length > 0) {
    coords.map((coord) => calcPlanetData(coord.x, coord.y, initializers, verbose));
  } else {
    for (let x = 0; x < rounds; x++) {
      for (let y = 0; y < rounds; y++) {
        const xOffset = x + offset;
        const negXOffset = xOffset === 0 ? 0 : xOffset * -1;
        const yOffset = y + offset;
        const negYOffset = yOffset === 0 ? 0 : yOffset * -1;
        if (verbose) console.log(`coords`, xOffset, negXOffset, yOffset, negYOffset);
        calcPlanetData(xOffset, yOffset, initializers, verbose);
        calcPlanetData(xOffset, negYOffset, initializers, verbose);
        calcPlanetData(negXOffset, yOffset, initializers, verbose);
        calcPlanetData(negXOffset, negYOffset, initializers, verbose);
      }
    }
  }
}
