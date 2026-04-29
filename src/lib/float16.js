const floatView = new Float32Array(1);
const int32View = new Int32Array(floatView.buffer);

function float32ToFloat16(value) {
  floatView[0] = value;

  const x = int32View[0];
  let bits = (x >> 16) & 0x8000;
  let mantissa = (x >> 12) & 0x07ff;
  const exponent = (x >> 23) & 0xff;

  if (exponent < 103) {
    return bits;
  }

  if (exponent > 142) {
    bits |= 0x7c00;
    if (exponent === 255 && (x & 0x007fffff) !== 0) {
      bits |= 0x0200;
    }
    return bits;
  }

  if (exponent < 113) {
    mantissa |= 0x0800;
    bits |= (mantissa >> (114 - exponent)) + ((mantissa >> (113 - exponent)) & 1);
    return bits;
  }

  bits |= ((exponent - 112) << 10) | (mantissa >> 1);
  bits += mantissa & 1;

  return bits;
}

function float16ToFloat32(bits) {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits & 0x7c00) >> 10;
  const fraction = bits & 0x03ff;

  if (exponent === 0) {
    return sign * (fraction === 0 ? 0 : 2 ** -14 * (fraction / 1024));
  }

  if (exponent === 0x1f) {
    return fraction === 0 ? sign * Infinity : NaN;
  }

  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

const normalizedByteToHalf = Uint16Array.from({ length: 256 }, (_, value) => float32ToFloat16(value / 255));

export function normalizedByteToFloat16(value) {
  return normalizedByteToHalf[value];
}

export function tensorDataToFloat32(tensor) {
  const data = tensor.data;

  if (tensor.type !== "float16") {
    return data;
  }

  const Float16ArrayCtor = globalThis.Float16Array;
  if (Float16ArrayCtor && data instanceof Float16ArrayCtor) {
    return Float32Array.from(data);
  }

  const output = new Float32Array(data.length);

  for (let index = 0; index < data.length; index += 1) {
    output[index] = float16ToFloat32(data[index]);
  }

  return output;
}
