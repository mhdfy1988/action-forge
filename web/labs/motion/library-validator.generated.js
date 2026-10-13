var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// motion-library-validator.js
var validate = validate10;
var motion_library_validator_default = validate10;
var schema11 = { "type": "object", "$defs": { "embeddedAction": { "type": "object", "additionalProperties": false, "required": ["id", "name", "clips", "items"], "properties": { "id": { "type": "string", "minLength": 1 }, "name": { "type": "string", "minLength": 1, "maxLength": 80 }, "clips": { "type": "array", "items": { "type": "object", "required": ["name", "duration", "tracks"], "properties": { "name": { "type": "string" }, "duration": { "type": "number", "exclusiveMinimum": 0 }, "tracks": { "type": "array", "items": { "type": "object", "required": ["name", "type", "times", "values"], "properties": { "name": { "type": "string" }, "nodeIndex": { "type": "integer", "minimum": 0 }, "type": { "enum": ["vector", "quaternion", "number", "bool", "color", "string"] }, "times": { "type": "array", "minItems": 1, "items": { "type": "number" } }, "values": { "type": "array", "minItems": 1, "items": { "type": ["number", "string", "boolean"] } } } } }, "recipe": { "$ref": "#/$defs/embeddedAction" } } } }, "items": { "type": "array", "minItems": 1, "maxItems": 1e3, "items": { "type": "object", "additionalProperties": false, "required": ["kind", "name", "transition"], "allOf": [{ "if": { "properties": { "kind": { "const": "action" } } }, "then": { "required": ["clipIndex"] } }, { "if": { "properties": { "kind": { "const": "pose" } } }, "then": { "required": ["pose", "duration"] } }], "properties": { "kind": { "enum": ["action", "pose"] }, "name": { "type": "string" }, "transition": { "type": "number", "minimum": 0, "maximum": 5 }, "clipIndex": { "type": "integer", "minimum": 0 }, "in": { "type": "number", "minimum": 0 }, "out": { "type": "number", "exclusiveMinimum": 0 }, "duration": { "type": "number", "exclusiveMinimum": 0, "maximum": 300 }, "pose": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["p", "q", "s"], "properties": { "p": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "q": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 }, "s": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "m": { "type": "array", "items": { "type": "number" } } } } } } } } } } }, "additionalProperties": false, "required": ["version", "modelKey", "actions"], "properties": { "model": { "type": "object", "additionalProperties": false, "required": ["name"], "properties": { "name": { "type": "string", "minLength": 1, "maxLength": 80 }, "builtinId": { "enum": ["quaternius", "mesh2motion", "makehuman"] } } }, "testPoseCleanup": { "const": 1 }, "thirdParty": { "type": "array", "maxItems": 500, "items": { "type": "object", "additionalProperties": false, "required": ["id", "name", "clips", "items"], "properties": { "id": { "type": "string", "minLength": 1 }, "name": { "type": "string", "minLength": 1, "maxLength": 80 }, "clips": { "type": "array", "items": { "type": "object", "required": ["name", "duration", "tracks"], "properties": { "name": { "type": "string" }, "duration": { "type": "number", "exclusiveMinimum": 0 }, "tracks": { "type": "array", "items": { "type": "object", "required": ["name", "type", "times", "values"], "properties": { "name": { "type": "string" }, "nodeIndex": { "type": "integer", "minimum": 0 }, "type": { "enum": ["vector", "quaternion", "number", "bool", "color", "string"] }, "times": { "type": "array", "minItems": 1, "items": { "type": "number" } }, "values": { "type": "array", "minItems": 1, "items": { "type": ["number", "string", "boolean"] } } } } }, "recipe": { "$ref": "#/$defs/embeddedAction" } } } }, "items": { "type": "array", "minItems": 1, "maxItems": 1e3, "items": { "type": "object", "additionalProperties": false, "required": ["kind", "name", "transition"], "allOf": [{ "if": { "properties": { "kind": { "const": "action" } } }, "then": { "required": ["clipIndex"] } }, { "if": { "properties": { "kind": { "const": "pose" } } }, "then": { "required": ["pose", "duration"] } }], "properties": { "kind": { "enum": ["action", "pose"] }, "name": { "type": "string" }, "transition": { "type": "number", "minimum": 0, "maximum": 5 }, "clipIndex": { "type": "integer", "minimum": 0 }, "in": { "type": "number", "minimum": 0 }, "out": { "type": "number", "exclusiveMinimum": 0 }, "duration": { "type": "number", "exclusiveMinimum": 0, "maximum": 300 }, "pose": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["p", "q", "s"], "properties": { "p": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "q": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 }, "s": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "m": { "type": "array", "items": { "type": "number" } } } } } } } } } } }, "version": { "enum": [1, 2] }, "modelKey": { "type": "string", "pattern": "^[a-f0-9]{64}$" }, "actions": { "type": "array", "maxItems": 200, "items": { "type": "object", "additionalProperties": false, "required": ["id", "name", "clips", "items"], "properties": { "id": { "type": "string", "minLength": 1 }, "name": { "type": "string", "minLength": 1, "maxLength": 80 }, "clips": { "type": "array", "items": { "type": "object", "required": ["name", "duration", "tracks"], "properties": { "name": { "type": "string" }, "duration": { "type": "number", "exclusiveMinimum": 0 }, "tracks": { "type": "array", "items": { "type": "object", "required": ["name", "type", "times", "values"], "properties": { "name": { "type": "string" }, "nodeIndex": { "type": "integer", "minimum": 0 }, "type": { "enum": ["vector", "quaternion", "number", "bool", "color", "string"] }, "times": { "type": "array", "minItems": 1, "items": { "type": "number" } }, "values": { "type": "array", "minItems": 1, "items": { "type": ["number", "string", "boolean"] } } } } }, "recipe": { "$ref": "#/$defs/embeddedAction" } } } }, "items": { "type": "array", "minItems": 1, "maxItems": 1e3, "items": { "type": "object", "additionalProperties": false, "required": ["kind", "name", "transition"], "allOf": [{ "if": { "properties": { "kind": { "const": "action" } } }, "then": { "required": ["clipIndex"] } }, { "if": { "properties": { "kind": { "const": "pose" } } }, "then": { "required": ["pose", "duration"] } }], "properties": { "kind": { "enum": ["action", "pose"] }, "name": { "type": "string" }, "transition": { "type": "number", "minimum": 0, "maximum": 5 }, "clipIndex": { "type": "integer", "minimum": 0 }, "in": { "type": "number", "minimum": 0 }, "out": { "type": "number", "exclusiveMinimum": 0 }, "duration": { "type": "number", "exclusiveMinimum": 0, "maximum": 300 }, "pose": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["p", "q", "s"], "properties": { "p": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "q": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 }, "s": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "m": { "type": "array", "items": { "type": "number" } } } } } } } } } } }, "poses": { "type": "array", "maxItems": 500, "items": { "type": "object", "additionalProperties": false, "required": ["id", "name", "pose"], "properties": { "id": { "type": "string", "minLength": 1 }, "name": { "type": "string", "minLength": 1, "maxLength": 80 }, "pose": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["p", "q", "s"], "properties": { "p": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "q": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 }, "s": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "m": { "type": "array", "items": { "type": "number" } } } } } } } } } };
var func2 = require_ucs2length().default;
var schema12 = { "type": "object", "additionalProperties": false, "required": ["id", "name", "clips", "items"], "properties": { "id": { "type": "string", "minLength": 1 }, "name": { "type": "string", "minLength": 1, "maxLength": 80 }, "clips": { "type": "array", "items": { "type": "object", "required": ["name", "duration", "tracks"], "properties": { "name": { "type": "string" }, "duration": { "type": "number", "exclusiveMinimum": 0 }, "tracks": { "type": "array", "items": { "type": "object", "required": ["name", "type", "times", "values"], "properties": { "name": { "type": "string" }, "nodeIndex": { "type": "integer", "minimum": 0 }, "type": { "enum": ["vector", "quaternion", "number", "bool", "color", "string"] }, "times": { "type": "array", "minItems": 1, "items": { "type": "number" } }, "values": { "type": "array", "minItems": 1, "items": { "type": ["number", "string", "boolean"] } } } } }, "recipe": { "$ref": "#/$defs/embeddedAction" } } } }, "items": { "type": "array", "minItems": 1, "maxItems": 1e3, "items": { "type": "object", "additionalProperties": false, "required": ["kind", "name", "transition"], "allOf": [{ "if": { "properties": { "kind": { "const": "action" } } }, "then": { "required": ["clipIndex"] } }, { "if": { "properties": { "kind": { "const": "pose" } } }, "then": { "required": ["pose", "duration"] } }], "properties": { "kind": { "enum": ["action", "pose"] }, "name": { "type": "string" }, "transition": { "type": "number", "minimum": 0, "maximum": 5 }, "clipIndex": { "type": "integer", "minimum": 0 }, "in": { "type": "number", "minimum": 0 }, "out": { "type": "number", "exclusiveMinimum": 0 }, "duration": { "type": "number", "exclusiveMinimum": 0, "maximum": 300 }, "pose": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["p", "q", "s"], "properties": { "p": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "q": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 }, "s": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }, "m": { "type": "array", "items": { "type": "number" } } } } } } } } } };
var wrapper0 = { validate: validate11 };
function validate11(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0;
      if (data.id === void 0 && (missing0 = "id") || data.name === void 0 && (missing0 = "name") || data.clips === void 0 && (missing0 = "clips") || data.items === void 0 && (missing0 = "items")) {
        validate11.errors = [{ instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: missing0 }, message: "must have required property '" + missing0 + "'" }];
        return false;
      } else {
        const _errs1 = errors;
        for (const key0 in data) {
          if (!(key0 === "id" || key0 === "name" || key0 === "clips" || key0 === "items")) {
            validate11.errors = [{ instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" }];
            return false;
            break;
          }
        }
        if (_errs1 === errors) {
          if (data.id !== void 0) {
            let data0 = data.id;
            const _errs2 = errors;
            if (errors === _errs2) {
              if (typeof data0 === "string") {
                if (func2(data0) < 1) {
                  validate11.errors = [{ instancePath: instancePath + "/id", schemaPath: "#/properties/id/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                  return false;
                }
              } else {
                validate11.errors = [{ instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                return false;
              }
            }
            var valid0 = _errs2 === errors;
          } else {
            var valid0 = true;
          }
          if (valid0) {
            if (data.name !== void 0) {
              let data1 = data.name;
              const _errs4 = errors;
              if (errors === _errs4) {
                if (typeof data1 === "string") {
                  if (func2(data1) > 80) {
                    validate11.errors = [{ instancePath: instancePath + "/name", schemaPath: "#/properties/name/maxLength", keyword: "maxLength", params: { limit: 80 }, message: "must NOT have more than 80 characters" }];
                    return false;
                  } else {
                    if (func2(data1) < 1) {
                      validate11.errors = [{ instancePath: instancePath + "/name", schemaPath: "#/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                      return false;
                    }
                  }
                } else {
                  validate11.errors = [{ instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                  return false;
                }
              }
              var valid0 = _errs4 === errors;
            } else {
              var valid0 = true;
            }
            if (valid0) {
              if (data.clips !== void 0) {
                let data2 = data.clips;
                const _errs6 = errors;
                if (errors === _errs6) {
                  if (Array.isArray(data2)) {
                    var valid1 = true;
                    const len0 = data2.length;
                    for (let i0 = 0; i0 < len0; i0++) {
                      let data3 = data2[i0];
                      const _errs8 = errors;
                      if (errors === _errs8) {
                        if (data3 && typeof data3 == "object" && !Array.isArray(data3)) {
                          let missing1;
                          if (data3.name === void 0 && (missing1 = "name") || data3.duration === void 0 && (missing1 = "duration") || data3.tracks === void 0 && (missing1 = "tracks")) {
                            validate11.errors = [{ instancePath: instancePath + "/clips/" + i0, schemaPath: "#/properties/clips/items/required", keyword: "required", params: { missingProperty: missing1 }, message: "must have required property '" + missing1 + "'" }];
                            return false;
                          } else {
                            if (data3.name !== void 0) {
                              const _errs10 = errors;
                              if (typeof data3.name !== "string") {
                                validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/name", schemaPath: "#/properties/clips/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                return false;
                              }
                              var valid2 = _errs10 === errors;
                            } else {
                              var valid2 = true;
                            }
                            if (valid2) {
                              if (data3.duration !== void 0) {
                                let data5 = data3.duration;
                                const _errs12 = errors;
                                if (errors === _errs12) {
                                  if (typeof data5 == "number") {
                                    if (data5 <= 0 || isNaN(data5)) {
                                      validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/duration", schemaPath: "#/properties/clips/items/properties/duration/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                      return false;
                                    }
                                  } else {
                                    validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/duration", schemaPath: "#/properties/clips/items/properties/duration/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                    return false;
                                  }
                                }
                                var valid2 = _errs12 === errors;
                              } else {
                                var valid2 = true;
                              }
                              if (valid2) {
                                if (data3.tracks !== void 0) {
                                  let data6 = data3.tracks;
                                  const _errs14 = errors;
                                  if (errors === _errs14) {
                                    if (Array.isArray(data6)) {
                                      var valid3 = true;
                                      const len1 = data6.length;
                                      for (let i1 = 0; i1 < len1; i1++) {
                                        let data7 = data6[i1];
                                        const _errs16 = errors;
                                        if (errors === _errs16) {
                                          if (data7 && typeof data7 == "object" && !Array.isArray(data7)) {
                                            let missing2;
                                            if (data7.name === void 0 && (missing2 = "name") || data7.type === void 0 && (missing2 = "type") || data7.times === void 0 && (missing2 = "times") || data7.values === void 0 && (missing2 = "values")) {
                                              validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1, schemaPath: "#/properties/clips/items/properties/tracks/items/required", keyword: "required", params: { missingProperty: missing2 }, message: "must have required property '" + missing2 + "'" }];
                                              return false;
                                            } else {
                                              if (data7.name !== void 0) {
                                                const _errs18 = errors;
                                                if (typeof data7.name !== "string") {
                                                  validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/name", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                  return false;
                                                }
                                                var valid4 = _errs18 === errors;
                                              } else {
                                                var valid4 = true;
                                              }
                                              if (valid4) {
                                                if (data7.nodeIndex !== void 0) {
                                                  let data9 = data7.nodeIndex;
                                                  const _errs20 = errors;
                                                  if (!(typeof data9 == "number" && (!(data9 % 1) && !isNaN(data9)))) {
                                                    validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/nodeIndex", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/nodeIndex/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                                                    return false;
                                                  }
                                                  if (errors === _errs20) {
                                                    if (typeof data9 == "number") {
                                                      if (data9 < 0 || isNaN(data9)) {
                                                        validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/nodeIndex", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/nodeIndex/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                        return false;
                                                      }
                                                    }
                                                  }
                                                  var valid4 = _errs20 === errors;
                                                } else {
                                                  var valid4 = true;
                                                }
                                                if (valid4) {
                                                  if (data7.type !== void 0) {
                                                    let data10 = data7.type;
                                                    const _errs22 = errors;
                                                    if (!(data10 === "vector" || data10 === "quaternion" || data10 === "number" || data10 === "bool" || data10 === "color" || data10 === "string")) {
                                                      validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/type", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/type/enum", keyword: "enum", params: { allowedValues: schema12.properties.clips.items.properties.tracks.items.properties.type.enum }, message: "must be equal to one of the allowed values" }];
                                                      return false;
                                                    }
                                                    var valid4 = _errs22 === errors;
                                                  } else {
                                                    var valid4 = true;
                                                  }
                                                  if (valid4) {
                                                    if (data7.times !== void 0) {
                                                      let data11 = data7.times;
                                                      const _errs23 = errors;
                                                      if (errors === _errs23) {
                                                        if (Array.isArray(data11)) {
                                                          if (data11.length < 1) {
                                                            validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/times", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/times/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                            return false;
                                                          } else {
                                                            var valid5 = true;
                                                            const len2 = data11.length;
                                                            for (let i2 = 0; i2 < len2; i2++) {
                                                              const _errs25 = errors;
                                                              if (!(typeof data11[i2] == "number")) {
                                                                validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/times/" + i2, schemaPath: "#/properties/clips/items/properties/tracks/items/properties/times/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                return false;
                                                              }
                                                              var valid5 = _errs25 === errors;
                                                              if (!valid5) {
                                                                break;
                                                              }
                                                            }
                                                          }
                                                        } else {
                                                          validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/times", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/times/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                          return false;
                                                        }
                                                      }
                                                      var valid4 = _errs23 === errors;
                                                    } else {
                                                      var valid4 = true;
                                                    }
                                                    if (valid4) {
                                                      if (data7.values !== void 0) {
                                                        let data13 = data7.values;
                                                        const _errs27 = errors;
                                                        if (errors === _errs27) {
                                                          if (Array.isArray(data13)) {
                                                            if (data13.length < 1) {
                                                              validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/values", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/values/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                              return false;
                                                            } else {
                                                              var valid6 = true;
                                                              const len3 = data13.length;
                                                              for (let i3 = 0; i3 < len3; i3++) {
                                                                let data14 = data13[i3];
                                                                const _errs29 = errors;
                                                                if (!(typeof data14 == "number") && typeof data14 !== "string" && typeof data14 !== "boolean") {
                                                                  validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/values/" + i3, schemaPath: "#/properties/clips/items/properties/tracks/items/properties/values/items/type", keyword: "type", params: { type: schema12.properties.clips.items.properties.tracks.items.properties.values.items.type }, message: "must be number,string,boolean" }];
                                                                  return false;
                                                                }
                                                                var valid6 = _errs29 === errors;
                                                                if (!valid6) {
                                                                  break;
                                                                }
                                                              }
                                                            }
                                                          } else {
                                                            validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1 + "/values", schemaPath: "#/properties/clips/items/properties/tracks/items/properties/values/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                            return false;
                                                          }
                                                        }
                                                        var valid4 = _errs27 === errors;
                                                      } else {
                                                        var valid4 = true;
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          } else {
                                            validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks/" + i1, schemaPath: "#/properties/clips/items/properties/tracks/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                            return false;
                                          }
                                        }
                                        var valid3 = _errs16 === errors;
                                        if (!valid3) {
                                          break;
                                        }
                                      }
                                    } else {
                                      validate11.errors = [{ instancePath: instancePath + "/clips/" + i0 + "/tracks", schemaPath: "#/properties/clips/items/properties/tracks/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                      return false;
                                    }
                                  }
                                  var valid2 = _errs14 === errors;
                                } else {
                                  var valid2 = true;
                                }
                                if (valid2) {
                                  if (data3.recipe !== void 0) {
                                    const _errs31 = errors;
                                    if (!wrapper0.validate(data3.recipe, { instancePath: instancePath + "/clips/" + i0 + "/recipe", parentData: data3, parentDataProperty: "recipe", rootData })) {
                                      vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
                                      errors = vErrors.length;
                                    }
                                    var valid2 = _errs31 === errors;
                                  } else {
                                    var valid2 = true;
                                  }
                                }
                              }
                            }
                          }
                        } else {
                          validate11.errors = [{ instancePath: instancePath + "/clips/" + i0, schemaPath: "#/properties/clips/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                          return false;
                        }
                      }
                      var valid1 = _errs8 === errors;
                      if (!valid1) {
                        break;
                      }
                    }
                  } else {
                    validate11.errors = [{ instancePath: instancePath + "/clips", schemaPath: "#/properties/clips/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                    return false;
                  }
                }
                var valid0 = _errs6 === errors;
              } else {
                var valid0 = true;
              }
              if (valid0) {
                if (data.items !== void 0) {
                  let data16 = data.items;
                  const _errs32 = errors;
                  if (errors === _errs32) {
                    if (Array.isArray(data16)) {
                      if (data16.length > 1e3) {
                        validate11.errors = [{ instancePath: instancePath + "/items", schemaPath: "#/properties/items/maxItems", keyword: "maxItems", params: { limit: 1e3 }, message: "must NOT have more than 1000 items" }];
                        return false;
                      } else {
                        if (data16.length < 1) {
                          validate11.errors = [{ instancePath: instancePath + "/items", schemaPath: "#/properties/items/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                          return false;
                        } else {
                          var valid7 = true;
                          const len4 = data16.length;
                          for (let i4 = 0; i4 < len4; i4++) {
                            let data17 = data16[i4];
                            const _errs34 = errors;
                            const _errs36 = errors;
                            const _errs37 = errors;
                            let valid9 = true;
                            const _errs38 = errors;
                            if (data17 && typeof data17 == "object" && !Array.isArray(data17)) {
                              if (data17.kind !== void 0) {
                                if ("action" !== data17.kind) {
                                  const err0 = {};
                                  if (vErrors === null) {
                                    vErrors = [err0];
                                  } else {
                                    vErrors.push(err0);
                                  }
                                  errors++;
                                }
                              }
                            }
                            var _valid0 = _errs38 === errors;
                            errors = _errs37;
                            if (vErrors !== null) {
                              if (_errs37) {
                                vErrors.length = _errs37;
                              } else {
                                vErrors = null;
                              }
                            }
                            if (_valid0) {
                              const _errs40 = errors;
                              if (data17 && typeof data17 == "object" && !Array.isArray(data17)) {
                                let missing3;
                                if (data17.clipIndex === void 0 && (missing3 = "clipIndex")) {
                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4, schemaPath: "#/properties/items/items/allOf/0/then/required", keyword: "required", params: { missingProperty: missing3 }, message: "must have required property '" + missing3 + "'" }];
                                  return false;
                                }
                              }
                              var _valid0 = _errs40 === errors;
                              valid9 = _valid0;
                            }
                            if (!valid9) {
                              const err1 = { instancePath: instancePath + "/items/" + i4, schemaPath: "#/properties/items/items/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                              if (vErrors === null) {
                                vErrors = [err1];
                              } else {
                                vErrors.push(err1);
                              }
                              errors++;
                              validate11.errors = vErrors;
                              return false;
                            }
                            var valid8 = _errs36 === errors;
                            if (valid8) {
                              const _errs41 = errors;
                              const _errs42 = errors;
                              let valid11 = true;
                              const _errs43 = errors;
                              if (data17 && typeof data17 == "object" && !Array.isArray(data17)) {
                                if (data17.kind !== void 0) {
                                  if ("pose" !== data17.kind) {
                                    const err2 = {};
                                    if (vErrors === null) {
                                      vErrors = [err2];
                                    } else {
                                      vErrors.push(err2);
                                    }
                                    errors++;
                                  }
                                }
                              }
                              var _valid1 = _errs43 === errors;
                              errors = _errs42;
                              if (vErrors !== null) {
                                if (_errs42) {
                                  vErrors.length = _errs42;
                                } else {
                                  vErrors = null;
                                }
                              }
                              if (_valid1) {
                                const _errs45 = errors;
                                if (data17 && typeof data17 == "object" && !Array.isArray(data17)) {
                                  let missing4;
                                  if (data17.pose === void 0 && (missing4 = "pose") || data17.duration === void 0 && (missing4 = "duration")) {
                                    validate11.errors = [{ instancePath: instancePath + "/items/" + i4, schemaPath: "#/properties/items/items/allOf/1/then/required", keyword: "required", params: { missingProperty: missing4 }, message: "must have required property '" + missing4 + "'" }];
                                    return false;
                                  }
                                }
                                var _valid1 = _errs45 === errors;
                                valid11 = _valid1;
                              }
                              if (!valid11) {
                                const err3 = { instancePath: instancePath + "/items/" + i4, schemaPath: "#/properties/items/items/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                                if (vErrors === null) {
                                  vErrors = [err3];
                                } else {
                                  vErrors.push(err3);
                                }
                                errors++;
                                validate11.errors = vErrors;
                                return false;
                              }
                              var valid8 = _errs41 === errors;
                            }
                            if (errors === _errs34) {
                              if (data17 && typeof data17 == "object" && !Array.isArray(data17)) {
                                let missing5;
                                if (data17.kind === void 0 && (missing5 = "kind") || data17.name === void 0 && (missing5 = "name") || data17.transition === void 0 && (missing5 = "transition")) {
                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4, schemaPath: "#/properties/items/items/required", keyword: "required", params: { missingProperty: missing5 }, message: "must have required property '" + missing5 + "'" }];
                                  return false;
                                } else {
                                  const _errs46 = errors;
                                  for (const key1 in data17) {
                                    if (!(key1 === "kind" || key1 === "name" || key1 === "transition" || key1 === "clipIndex" || key1 === "in" || key1 === "out" || key1 === "duration" || key1 === "pose")) {
                                      validate11.errors = [{ instancePath: instancePath + "/items/" + i4, schemaPath: "#/properties/items/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" }];
                                      return false;
                                      break;
                                    }
                                  }
                                  if (_errs46 === errors) {
                                    if (data17.kind !== void 0) {
                                      let data20 = data17.kind;
                                      const _errs47 = errors;
                                      if (!(data20 === "action" || data20 === "pose")) {
                                        validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/kind", schemaPath: "#/properties/items/items/properties/kind/enum", keyword: "enum", params: { allowedValues: schema12.properties.items.items.properties.kind.enum }, message: "must be equal to one of the allowed values" }];
                                        return false;
                                      }
                                      var valid13 = _errs47 === errors;
                                    } else {
                                      var valid13 = true;
                                    }
                                    if (valid13) {
                                      if (data17.name !== void 0) {
                                        const _errs48 = errors;
                                        if (typeof data17.name !== "string") {
                                          validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/name", schemaPath: "#/properties/items/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                          return false;
                                        }
                                        var valid13 = _errs48 === errors;
                                      } else {
                                        var valid13 = true;
                                      }
                                      if (valid13) {
                                        if (data17.transition !== void 0) {
                                          let data22 = data17.transition;
                                          const _errs50 = errors;
                                          if (errors === _errs50) {
                                            if (typeof data22 == "number") {
                                              if (data22 > 5 || isNaN(data22)) {
                                                validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/transition", schemaPath: "#/properties/items/items/properties/transition/maximum", keyword: "maximum", params: { comparison: "<=", limit: 5 }, message: "must be <= 5" }];
                                                return false;
                                              } else {
                                                if (data22 < 0 || isNaN(data22)) {
                                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/transition", schemaPath: "#/properties/items/items/properties/transition/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                  return false;
                                                }
                                              }
                                            } else {
                                              validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/transition", schemaPath: "#/properties/items/items/properties/transition/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                              return false;
                                            }
                                          }
                                          var valid13 = _errs50 === errors;
                                        } else {
                                          var valid13 = true;
                                        }
                                        if (valid13) {
                                          if (data17.clipIndex !== void 0) {
                                            let data23 = data17.clipIndex;
                                            const _errs52 = errors;
                                            if (!(typeof data23 == "number" && (!(data23 % 1) && !isNaN(data23)))) {
                                              validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/clipIndex", schemaPath: "#/properties/items/items/properties/clipIndex/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                                              return false;
                                            }
                                            if (errors === _errs52) {
                                              if (typeof data23 == "number") {
                                                if (data23 < 0 || isNaN(data23)) {
                                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/clipIndex", schemaPath: "#/properties/items/items/properties/clipIndex/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                  return false;
                                                }
                                              }
                                            }
                                            var valid13 = _errs52 === errors;
                                          } else {
                                            var valid13 = true;
                                          }
                                          if (valid13) {
                                            if (data17.in !== void 0) {
                                              let data24 = data17.in;
                                              const _errs54 = errors;
                                              if (errors === _errs54) {
                                                if (typeof data24 == "number") {
                                                  if (data24 < 0 || isNaN(data24)) {
                                                    validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/in", schemaPath: "#/properties/items/items/properties/in/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                    return false;
                                                  }
                                                } else {
                                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/in", schemaPath: "#/properties/items/items/properties/in/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                  return false;
                                                }
                                              }
                                              var valid13 = _errs54 === errors;
                                            } else {
                                              var valid13 = true;
                                            }
                                            if (valid13) {
                                              if (data17.out !== void 0) {
                                                let data25 = data17.out;
                                                const _errs56 = errors;
                                                if (errors === _errs56) {
                                                  if (typeof data25 == "number") {
                                                    if (data25 <= 0 || isNaN(data25)) {
                                                      validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/out", schemaPath: "#/properties/items/items/properties/out/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                      return false;
                                                    }
                                                  } else {
                                                    validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/out", schemaPath: "#/properties/items/items/properties/out/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                    return false;
                                                  }
                                                }
                                                var valid13 = _errs56 === errors;
                                              } else {
                                                var valid13 = true;
                                              }
                                              if (valid13) {
                                                if (data17.duration !== void 0) {
                                                  let data26 = data17.duration;
                                                  const _errs58 = errors;
                                                  if (errors === _errs58) {
                                                    if (typeof data26 == "number") {
                                                      if (data26 > 300 || isNaN(data26)) {
                                                        validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/duration", schemaPath: "#/properties/items/items/properties/duration/maximum", keyword: "maximum", params: { comparison: "<=", limit: 300 }, message: "must be <= 300" }];
                                                        return false;
                                                      } else {
                                                        if (data26 <= 0 || isNaN(data26)) {
                                                          validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/duration", schemaPath: "#/properties/items/items/properties/duration/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                          return false;
                                                        }
                                                      }
                                                    } else {
                                                      validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/duration", schemaPath: "#/properties/items/items/properties/duration/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                      return false;
                                                    }
                                                  }
                                                  var valid13 = _errs58 === errors;
                                                } else {
                                                  var valid13 = true;
                                                }
                                                if (valid13) {
                                                  if (data17.pose !== void 0) {
                                                    let data27 = data17.pose;
                                                    const _errs60 = errors;
                                                    if (errors === _errs60) {
                                                      if (Array.isArray(data27)) {
                                                        if (data27.length < 1) {
                                                          validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose", schemaPath: "#/properties/items/items/properties/pose/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                          return false;
                                                        } else {
                                                          var valid14 = true;
                                                          const len5 = data27.length;
                                                          for (let i5 = 0; i5 < len5; i5++) {
                                                            let data28 = data27[i5];
                                                            const _errs62 = errors;
                                                            if (errors === _errs62) {
                                                              if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
                                                                let missing6;
                                                                if (data28.p === void 0 && (missing6 = "p") || data28.q === void 0 && (missing6 = "q") || data28.s === void 0 && (missing6 = "s")) {
                                                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5, schemaPath: "#/properties/items/items/properties/pose/items/required", keyword: "required", params: { missingProperty: missing6 }, message: "must have required property '" + missing6 + "'" }];
                                                                  return false;
                                                                } else {
                                                                  if (data28.p !== void 0) {
                                                                    let data29 = data28.p;
                                                                    const _errs64 = errors;
                                                                    if (errors === _errs64) {
                                                                      if (Array.isArray(data29)) {
                                                                        if (data29.length > 3) {
                                                                          validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/p", schemaPath: "#/properties/items/items/properties/pose/items/properties/p/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                          return false;
                                                                        } else {
                                                                          if (data29.length < 3) {
                                                                            validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/p", schemaPath: "#/properties/items/items/properties/pose/items/properties/p/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                            return false;
                                                                          } else {
                                                                            var valid16 = true;
                                                                            const len6 = data29.length;
                                                                            for (let i6 = 0; i6 < len6; i6++) {
                                                                              const _errs66 = errors;
                                                                              if (!(typeof data29[i6] == "number")) {
                                                                                validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/p/" + i6, schemaPath: "#/properties/items/items/properties/pose/items/properties/p/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                return false;
                                                                              }
                                                                              var valid16 = _errs66 === errors;
                                                                              if (!valid16) {
                                                                                break;
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      } else {
                                                                        validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/p", schemaPath: "#/properties/items/items/properties/pose/items/properties/p/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                        return false;
                                                                      }
                                                                    }
                                                                    var valid15 = _errs64 === errors;
                                                                  } else {
                                                                    var valid15 = true;
                                                                  }
                                                                  if (valid15) {
                                                                    if (data28.q !== void 0) {
                                                                      let data31 = data28.q;
                                                                      const _errs68 = errors;
                                                                      if (errors === _errs68) {
                                                                        if (Array.isArray(data31)) {
                                                                          if (data31.length > 4) {
                                                                            validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/q", schemaPath: "#/properties/items/items/properties/pose/items/properties/q/maxItems", keyword: "maxItems", params: { limit: 4 }, message: "must NOT have more than 4 items" }];
                                                                            return false;
                                                                          } else {
                                                                            if (data31.length < 4) {
                                                                              validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/q", schemaPath: "#/properties/items/items/properties/pose/items/properties/q/minItems", keyword: "minItems", params: { limit: 4 }, message: "must NOT have fewer than 4 items" }];
                                                                              return false;
                                                                            } else {
                                                                              var valid17 = true;
                                                                              const len7 = data31.length;
                                                                              for (let i7 = 0; i7 < len7; i7++) {
                                                                                const _errs70 = errors;
                                                                                if (!(typeof data31[i7] == "number")) {
                                                                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/q/" + i7, schemaPath: "#/properties/items/items/properties/pose/items/properties/q/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                  return false;
                                                                                }
                                                                                var valid17 = _errs70 === errors;
                                                                                if (!valid17) {
                                                                                  break;
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        } else {
                                                                          validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/q", schemaPath: "#/properties/items/items/properties/pose/items/properties/q/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                          return false;
                                                                        }
                                                                      }
                                                                      var valid15 = _errs68 === errors;
                                                                    } else {
                                                                      var valid15 = true;
                                                                    }
                                                                    if (valid15) {
                                                                      if (data28.s !== void 0) {
                                                                        let data33 = data28.s;
                                                                        const _errs72 = errors;
                                                                        if (errors === _errs72) {
                                                                          if (Array.isArray(data33)) {
                                                                            if (data33.length > 3) {
                                                                              validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/s", schemaPath: "#/properties/items/items/properties/pose/items/properties/s/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                              return false;
                                                                            } else {
                                                                              if (data33.length < 3) {
                                                                                validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/s", schemaPath: "#/properties/items/items/properties/pose/items/properties/s/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                                return false;
                                                                              } else {
                                                                                var valid18 = true;
                                                                                const len8 = data33.length;
                                                                                for (let i8 = 0; i8 < len8; i8++) {
                                                                                  const _errs74 = errors;
                                                                                  if (!(typeof data33[i8] == "number")) {
                                                                                    validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/s/" + i8, schemaPath: "#/properties/items/items/properties/pose/items/properties/s/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                    return false;
                                                                                  }
                                                                                  var valid18 = _errs74 === errors;
                                                                                  if (!valid18) {
                                                                                    break;
                                                                                  }
                                                                                }
                                                                              }
                                                                            }
                                                                          } else {
                                                                            validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/s", schemaPath: "#/properties/items/items/properties/pose/items/properties/s/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                            return false;
                                                                          }
                                                                        }
                                                                        var valid15 = _errs72 === errors;
                                                                      } else {
                                                                        var valid15 = true;
                                                                      }
                                                                      if (valid15) {
                                                                        if (data28.m !== void 0) {
                                                                          let data35 = data28.m;
                                                                          const _errs76 = errors;
                                                                          if (errors === _errs76) {
                                                                            if (Array.isArray(data35)) {
                                                                              var valid19 = true;
                                                                              const len9 = data35.length;
                                                                              for (let i9 = 0; i9 < len9; i9++) {
                                                                                const _errs78 = errors;
                                                                                if (!(typeof data35[i9] == "number")) {
                                                                                  validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/m/" + i9, schemaPath: "#/properties/items/items/properties/pose/items/properties/m/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                  return false;
                                                                                }
                                                                                var valid19 = _errs78 === errors;
                                                                                if (!valid19) {
                                                                                  break;
                                                                                }
                                                                              }
                                                                            } else {
                                                                              validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5 + "/m", schemaPath: "#/properties/items/items/properties/pose/items/properties/m/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                              return false;
                                                                            }
                                                                          }
                                                                          var valid15 = _errs76 === errors;
                                                                        } else {
                                                                          var valid15 = true;
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              } else {
                                                                validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose/" + i5, schemaPath: "#/properties/items/items/properties/pose/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                                return false;
                                                              }
                                                            }
                                                            var valid14 = _errs62 === errors;
                                                            if (!valid14) {
                                                              break;
                                                            }
                                                          }
                                                        }
                                                      } else {
                                                        validate11.errors = [{ instancePath: instancePath + "/items/" + i4 + "/pose", schemaPath: "#/properties/items/items/properties/pose/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                        return false;
                                                      }
                                                    }
                                                    var valid13 = _errs60 === errors;
                                                  } else {
                                                    var valid13 = true;
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              } else {
                                validate11.errors = [{ instancePath: instancePath + "/items/" + i4, schemaPath: "#/properties/items/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                return false;
                              }
                            }
                            var valid7 = _errs34 === errors;
                            if (!valid7) {
                              break;
                            }
                          }
                        }
                      }
                    } else {
                      validate11.errors = [{ instancePath: instancePath + "/items", schemaPath: "#/properties/items/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                      return false;
                    }
                  }
                  var valid0 = _errs32 === errors;
                } else {
                  var valid0 = true;
                }
              }
            }
          }
        }
      }
    } else {
      validate11.errors = [{ instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
      return false;
    }
  }
  validate11.errors = vErrors;
  return errors === 0;
}
var pattern0 = new RegExp("^[a-f0-9]{64}$", "u");
function validate10(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0;
      if (data.version === void 0 && (missing0 = "version") || data.modelKey === void 0 && (missing0 = "modelKey") || data.actions === void 0 && (missing0 = "actions")) {
        validate10.errors = [{ instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: missing0 }, message: "must have required property '" + missing0 + "'" }];
        return false;
      } else {
        const _errs1 = errors;
        for (const key0 in data) {
          if (!(key0 === "model" || key0 === "testPoseCleanup" || key0 === "thirdParty" || key0 === "version" || key0 === "modelKey" || key0 === "actions" || key0 === "poses")) {
            validate10.errors = [{ instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" }];
            return false;
            break;
          }
        }
        if (_errs1 === errors) {
          if (data.model !== void 0) {
            let data0 = data.model;
            const _errs2 = errors;
            if (errors === _errs2) {
              if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
                let missing1;
                if (data0.name === void 0 && (missing1 = "name")) {
                  validate10.errors = [{ instancePath: instancePath + "/model", schemaPath: "#/properties/model/required", keyword: "required", params: { missingProperty: missing1 }, message: "must have required property '" + missing1 + "'" }];
                  return false;
                } else {
                  const _errs4 = errors;
                  for (const key1 in data0) {
                    if (!(key1 === "name" || key1 === "builtinId")) {
                      validate10.errors = [{ instancePath: instancePath + "/model", schemaPath: "#/properties/model/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" }];
                      return false;
                      break;
                    }
                  }
                  if (_errs4 === errors) {
                    if (data0.name !== void 0) {
                      let data1 = data0.name;
                      const _errs5 = errors;
                      if (errors === _errs5) {
                        if (typeof data1 === "string") {
                          if (func2(data1) > 80) {
                            validate10.errors = [{ instancePath: instancePath + "/model/name", schemaPath: "#/properties/model/properties/name/maxLength", keyword: "maxLength", params: { limit: 80 }, message: "must NOT have more than 80 characters" }];
                            return false;
                          } else {
                            if (func2(data1) < 1) {
                              validate10.errors = [{ instancePath: instancePath + "/model/name", schemaPath: "#/properties/model/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                              return false;
                            }
                          }
                        } else {
                          validate10.errors = [{ instancePath: instancePath + "/model/name", schemaPath: "#/properties/model/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                          return false;
                        }
                      }
                      var valid1 = _errs5 === errors;
                    } else {
                      var valid1 = true;
                    }
                    if (valid1) {
                      if (data0.builtinId !== void 0) {
                        let data2 = data0.builtinId;
                        const _errs7 = errors;
                        if (!(data2 === "quaternius" || data2 === "mesh2motion" || data2 === "makehuman")) {
                          validate10.errors = [{ instancePath: instancePath + "/model/builtinId", schemaPath: "#/properties/model/properties/builtinId/enum", keyword: "enum", params: { allowedValues: schema11.properties.model.properties.builtinId.enum }, message: "must be equal to one of the allowed values" }];
                          return false;
                        }
                        var valid1 = _errs7 === errors;
                      } else {
                        var valid1 = true;
                      }
                    }
                  }
                }
              } else {
                validate10.errors = [{ instancePath: instancePath + "/model", schemaPath: "#/properties/model/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                return false;
              }
            }
            var valid0 = _errs2 === errors;
          } else {
            var valid0 = true;
          }
          if (valid0) {
            if (data.testPoseCleanup !== void 0) {
              const _errs8 = errors;
              if (1 !== data.testPoseCleanup) {
                validate10.errors = [{ instancePath: instancePath + "/testPoseCleanup", schemaPath: "#/properties/testPoseCleanup/const", keyword: "const", params: { allowedValue: 1 }, message: "must be equal to constant" }];
                return false;
              }
              var valid0 = _errs8 === errors;
            } else {
              var valid0 = true;
            }
            if (valid0) {
              if (data.thirdParty !== void 0) {
                let data4 = data.thirdParty;
                const _errs9 = errors;
                if (errors === _errs9) {
                  if (Array.isArray(data4)) {
                    if (data4.length > 500) {
                      validate10.errors = [{ instancePath: instancePath + "/thirdParty", schemaPath: "#/properties/thirdParty/maxItems", keyword: "maxItems", params: { limit: 500 }, message: "must NOT have more than 500 items" }];
                      return false;
                    } else {
                      var valid2 = true;
                      const len0 = data4.length;
                      for (let i0 = 0; i0 < len0; i0++) {
                        let data5 = data4[i0];
                        const _errs11 = errors;
                        if (errors === _errs11) {
                          if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
                            let missing2;
                            if (data5.id === void 0 && (missing2 = "id") || data5.name === void 0 && (missing2 = "name") || data5.clips === void 0 && (missing2 = "clips") || data5.items === void 0 && (missing2 = "items")) {
                              validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0, schemaPath: "#/properties/thirdParty/items/required", keyword: "required", params: { missingProperty: missing2 }, message: "must have required property '" + missing2 + "'" }];
                              return false;
                            } else {
                              const _errs13 = errors;
                              for (const key2 in data5) {
                                if (!(key2 === "id" || key2 === "name" || key2 === "clips" || key2 === "items")) {
                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0, schemaPath: "#/properties/thirdParty/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" }];
                                  return false;
                                  break;
                                }
                              }
                              if (_errs13 === errors) {
                                if (data5.id !== void 0) {
                                  let data6 = data5.id;
                                  const _errs14 = errors;
                                  if (errors === _errs14) {
                                    if (typeof data6 === "string") {
                                      if (func2(data6) < 1) {
                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/id", schemaPath: "#/properties/thirdParty/items/properties/id/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                                        return false;
                                      }
                                    } else {
                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/id", schemaPath: "#/properties/thirdParty/items/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                      return false;
                                    }
                                  }
                                  var valid3 = _errs14 === errors;
                                } else {
                                  var valid3 = true;
                                }
                                if (valid3) {
                                  if (data5.name !== void 0) {
                                    let data7 = data5.name;
                                    const _errs16 = errors;
                                    if (errors === _errs16) {
                                      if (typeof data7 === "string") {
                                        if (func2(data7) > 80) {
                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/name", schemaPath: "#/properties/thirdParty/items/properties/name/maxLength", keyword: "maxLength", params: { limit: 80 }, message: "must NOT have more than 80 characters" }];
                                          return false;
                                        } else {
                                          if (func2(data7) < 1) {
                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/name", schemaPath: "#/properties/thirdParty/items/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                                            return false;
                                          }
                                        }
                                      } else {
                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/name", schemaPath: "#/properties/thirdParty/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                        return false;
                                      }
                                    }
                                    var valid3 = _errs16 === errors;
                                  } else {
                                    var valid3 = true;
                                  }
                                  if (valid3) {
                                    if (data5.clips !== void 0) {
                                      let data8 = data5.clips;
                                      const _errs18 = errors;
                                      if (errors === _errs18) {
                                        if (Array.isArray(data8)) {
                                          var valid4 = true;
                                          const len1 = data8.length;
                                          for (let i1 = 0; i1 < len1; i1++) {
                                            let data9 = data8[i1];
                                            const _errs20 = errors;
                                            if (errors === _errs20) {
                                              if (data9 && typeof data9 == "object" && !Array.isArray(data9)) {
                                                let missing3;
                                                if (data9.name === void 0 && (missing3 = "name") || data9.duration === void 0 && (missing3 = "duration") || data9.tracks === void 0 && (missing3 = "tracks")) {
                                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1, schemaPath: "#/properties/thirdParty/items/properties/clips/items/required", keyword: "required", params: { missingProperty: missing3 }, message: "must have required property '" + missing3 + "'" }];
                                                  return false;
                                                } else {
                                                  if (data9.name !== void 0) {
                                                    const _errs22 = errors;
                                                    if (typeof data9.name !== "string") {
                                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/name", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                      return false;
                                                    }
                                                    var valid5 = _errs22 === errors;
                                                  } else {
                                                    var valid5 = true;
                                                  }
                                                  if (valid5) {
                                                    if (data9.duration !== void 0) {
                                                      let data11 = data9.duration;
                                                      const _errs24 = errors;
                                                      if (errors === _errs24) {
                                                        if (typeof data11 == "number") {
                                                          if (data11 <= 0 || isNaN(data11)) {
                                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/duration", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/duration/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                            return false;
                                                          }
                                                        } else {
                                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/duration", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/duration/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                          return false;
                                                        }
                                                      }
                                                      var valid5 = _errs24 === errors;
                                                    } else {
                                                      var valid5 = true;
                                                    }
                                                    if (valid5) {
                                                      if (data9.tracks !== void 0) {
                                                        let data12 = data9.tracks;
                                                        const _errs26 = errors;
                                                        if (errors === _errs26) {
                                                          if (Array.isArray(data12)) {
                                                            var valid6 = true;
                                                            const len2 = data12.length;
                                                            for (let i2 = 0; i2 < len2; i2++) {
                                                              let data13 = data12[i2];
                                                              const _errs28 = errors;
                                                              if (errors === _errs28) {
                                                                if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
                                                                  let missing4;
                                                                  if (data13.name === void 0 && (missing4 = "name") || data13.type === void 0 && (missing4 = "type") || data13.times === void 0 && (missing4 = "times") || data13.values === void 0 && (missing4 = "values")) {
                                                                    validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2, schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/required", keyword: "required", params: { missingProperty: missing4 }, message: "must have required property '" + missing4 + "'" }];
                                                                    return false;
                                                                  } else {
                                                                    if (data13.name !== void 0) {
                                                                      const _errs30 = errors;
                                                                      if (typeof data13.name !== "string") {
                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/name", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                                        return false;
                                                                      }
                                                                      var valid7 = _errs30 === errors;
                                                                    } else {
                                                                      var valid7 = true;
                                                                    }
                                                                    if (valid7) {
                                                                      if (data13.nodeIndex !== void 0) {
                                                                        let data15 = data13.nodeIndex;
                                                                        const _errs32 = errors;
                                                                        if (!(typeof data15 == "number" && (!(data15 % 1) && !isNaN(data15)))) {
                                                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/nodeIndex", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/nodeIndex/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                                                                          return false;
                                                                        }
                                                                        if (errors === _errs32) {
                                                                          if (typeof data15 == "number") {
                                                                            if (data15 < 0 || isNaN(data15)) {
                                                                              validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/nodeIndex", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/nodeIndex/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                              return false;
                                                                            }
                                                                          }
                                                                        }
                                                                        var valid7 = _errs32 === errors;
                                                                      } else {
                                                                        var valid7 = true;
                                                                      }
                                                                      if (valid7) {
                                                                        if (data13.type !== void 0) {
                                                                          let data16 = data13.type;
                                                                          const _errs34 = errors;
                                                                          if (!(data16 === "vector" || data16 === "quaternion" || data16 === "number" || data16 === "bool" || data16 === "color" || data16 === "string")) {
                                                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/type", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/type/enum", keyword: "enum", params: { allowedValues: schema11.properties.thirdParty.items.properties.clips.items.properties.tracks.items.properties.type.enum }, message: "must be equal to one of the allowed values" }];
                                                                            return false;
                                                                          }
                                                                          var valid7 = _errs34 === errors;
                                                                        } else {
                                                                          var valid7 = true;
                                                                        }
                                                                        if (valid7) {
                                                                          if (data13.times !== void 0) {
                                                                            let data17 = data13.times;
                                                                            const _errs35 = errors;
                                                                            if (errors === _errs35) {
                                                                              if (Array.isArray(data17)) {
                                                                                if (data17.length < 1) {
                                                                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/times", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/times/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                                                  return false;
                                                                                } else {
                                                                                  var valid8 = true;
                                                                                  const len3 = data17.length;
                                                                                  for (let i3 = 0; i3 < len3; i3++) {
                                                                                    const _errs37 = errors;
                                                                                    if (!(typeof data17[i3] == "number")) {
                                                                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/times/" + i3, schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/times/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                      return false;
                                                                                    }
                                                                                    var valid8 = _errs37 === errors;
                                                                                    if (!valid8) {
                                                                                      break;
                                                                                    }
                                                                                  }
                                                                                }
                                                                              } else {
                                                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/times", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/times/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                return false;
                                                                              }
                                                                            }
                                                                            var valid7 = _errs35 === errors;
                                                                          } else {
                                                                            var valid7 = true;
                                                                          }
                                                                          if (valid7) {
                                                                            if (data13.values !== void 0) {
                                                                              let data19 = data13.values;
                                                                              const _errs39 = errors;
                                                                              if (errors === _errs39) {
                                                                                if (Array.isArray(data19)) {
                                                                                  if (data19.length < 1) {
                                                                                    validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/values", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/values/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                                                    return false;
                                                                                  } else {
                                                                                    var valid9 = true;
                                                                                    const len4 = data19.length;
                                                                                    for (let i4 = 0; i4 < len4; i4++) {
                                                                                      let data20 = data19[i4];
                                                                                      const _errs41 = errors;
                                                                                      if (!(typeof data20 == "number") && typeof data20 !== "string" && typeof data20 !== "boolean") {
                                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/values/" + i4, schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/values/items/type", keyword: "type", params: { type: schema11.properties.thirdParty.items.properties.clips.items.properties.tracks.items.properties.values.items.type }, message: "must be number,string,boolean" }];
                                                                                        return false;
                                                                                      }
                                                                                      var valid9 = _errs41 === errors;
                                                                                      if (!valid9) {
                                                                                        break;
                                                                                      }
                                                                                    }
                                                                                  }
                                                                                } else {
                                                                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2 + "/values", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/properties/values/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                  return false;
                                                                                }
                                                                              }
                                                                              var valid7 = _errs39 === errors;
                                                                            } else {
                                                                              var valid7 = true;
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                } else {
                                                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks/" + i2, schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                                  return false;
                                                                }
                                                              }
                                                              var valid6 = _errs28 === errors;
                                                              if (!valid6) {
                                                                break;
                                                              }
                                                            }
                                                          } else {
                                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/tracks", schemaPath: "#/properties/thirdParty/items/properties/clips/items/properties/tracks/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                            return false;
                                                          }
                                                        }
                                                        var valid5 = _errs26 === errors;
                                                      } else {
                                                        var valid5 = true;
                                                      }
                                                      if (valid5) {
                                                        if (data9.recipe !== void 0) {
                                                          const _errs43 = errors;
                                                          if (!validate11(data9.recipe, { instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1 + "/recipe", parentData: data9, parentDataProperty: "recipe", rootData })) {
                                                            vErrors = vErrors === null ? validate11.errors : vErrors.concat(validate11.errors);
                                                            errors = vErrors.length;
                                                          }
                                                          var valid5 = _errs43 === errors;
                                                        } else {
                                                          var valid5 = true;
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              } else {
                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips/" + i1, schemaPath: "#/properties/thirdParty/items/properties/clips/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                return false;
                                              }
                                            }
                                            var valid4 = _errs20 === errors;
                                            if (!valid4) {
                                              break;
                                            }
                                          }
                                        } else {
                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/clips", schemaPath: "#/properties/thirdParty/items/properties/clips/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                          return false;
                                        }
                                      }
                                      var valid3 = _errs18 === errors;
                                    } else {
                                      var valid3 = true;
                                    }
                                    if (valid3) {
                                      if (data5.items !== void 0) {
                                        let data22 = data5.items;
                                        const _errs44 = errors;
                                        if (errors === _errs44) {
                                          if (Array.isArray(data22)) {
                                            if (data22.length > 1e3) {
                                              validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items", schemaPath: "#/properties/thirdParty/items/properties/items/maxItems", keyword: "maxItems", params: { limit: 1e3 }, message: "must NOT have more than 1000 items" }];
                                              return false;
                                            } else {
                                              if (data22.length < 1) {
                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items", schemaPath: "#/properties/thirdParty/items/properties/items/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                return false;
                                              } else {
                                                var valid10 = true;
                                                const len5 = data22.length;
                                                for (let i5 = 0; i5 < len5; i5++) {
                                                  let data23 = data22[i5];
                                                  const _errs46 = errors;
                                                  const _errs48 = errors;
                                                  const _errs49 = errors;
                                                  let valid12 = true;
                                                  const _errs50 = errors;
                                                  if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                                                    if (data23.kind !== void 0) {
                                                      if ("action" !== data23.kind) {
                                                        const err0 = {};
                                                        if (vErrors === null) {
                                                          vErrors = [err0];
                                                        } else {
                                                          vErrors.push(err0);
                                                        }
                                                        errors++;
                                                      }
                                                    }
                                                  }
                                                  var _valid0 = _errs50 === errors;
                                                  errors = _errs49;
                                                  if (vErrors !== null) {
                                                    if (_errs49) {
                                                      vErrors.length = _errs49;
                                                    } else {
                                                      vErrors = null;
                                                    }
                                                  }
                                                  if (_valid0) {
                                                    const _errs52 = errors;
                                                    if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                                                      let missing5;
                                                      if (data23.clipIndex === void 0 && (missing5 = "clipIndex")) {
                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5, schemaPath: "#/properties/thirdParty/items/properties/items/items/allOf/0/then/required", keyword: "required", params: { missingProperty: missing5 }, message: "must have required property '" + missing5 + "'" }];
                                                        return false;
                                                      }
                                                    }
                                                    var _valid0 = _errs52 === errors;
                                                    valid12 = _valid0;
                                                  }
                                                  if (!valid12) {
                                                    const err1 = { instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5, schemaPath: "#/properties/thirdParty/items/properties/items/items/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                                                    if (vErrors === null) {
                                                      vErrors = [err1];
                                                    } else {
                                                      vErrors.push(err1);
                                                    }
                                                    errors++;
                                                    validate10.errors = vErrors;
                                                    return false;
                                                  }
                                                  var valid11 = _errs48 === errors;
                                                  if (valid11) {
                                                    const _errs53 = errors;
                                                    const _errs54 = errors;
                                                    let valid14 = true;
                                                    const _errs55 = errors;
                                                    if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                                                      if (data23.kind !== void 0) {
                                                        if ("pose" !== data23.kind) {
                                                          const err2 = {};
                                                          if (vErrors === null) {
                                                            vErrors = [err2];
                                                          } else {
                                                            vErrors.push(err2);
                                                          }
                                                          errors++;
                                                        }
                                                      }
                                                    }
                                                    var _valid1 = _errs55 === errors;
                                                    errors = _errs54;
                                                    if (vErrors !== null) {
                                                      if (_errs54) {
                                                        vErrors.length = _errs54;
                                                      } else {
                                                        vErrors = null;
                                                      }
                                                    }
                                                    if (_valid1) {
                                                      const _errs57 = errors;
                                                      if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                                                        let missing6;
                                                        if (data23.pose === void 0 && (missing6 = "pose") || data23.duration === void 0 && (missing6 = "duration")) {
                                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5, schemaPath: "#/properties/thirdParty/items/properties/items/items/allOf/1/then/required", keyword: "required", params: { missingProperty: missing6 }, message: "must have required property '" + missing6 + "'" }];
                                                          return false;
                                                        }
                                                      }
                                                      var _valid1 = _errs57 === errors;
                                                      valid14 = _valid1;
                                                    }
                                                    if (!valid14) {
                                                      const err3 = { instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5, schemaPath: "#/properties/thirdParty/items/properties/items/items/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                                                      if (vErrors === null) {
                                                        vErrors = [err3];
                                                      } else {
                                                        vErrors.push(err3);
                                                      }
                                                      errors++;
                                                      validate10.errors = vErrors;
                                                      return false;
                                                    }
                                                    var valid11 = _errs53 === errors;
                                                  }
                                                  if (errors === _errs46) {
                                                    if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                                                      let missing7;
                                                      if (data23.kind === void 0 && (missing7 = "kind") || data23.name === void 0 && (missing7 = "name") || data23.transition === void 0 && (missing7 = "transition")) {
                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5, schemaPath: "#/properties/thirdParty/items/properties/items/items/required", keyword: "required", params: { missingProperty: missing7 }, message: "must have required property '" + missing7 + "'" }];
                                                        return false;
                                                      } else {
                                                        const _errs58 = errors;
                                                        for (const key3 in data23) {
                                                          if (!(key3 === "kind" || key3 === "name" || key3 === "transition" || key3 === "clipIndex" || key3 === "in" || key3 === "out" || key3 === "duration" || key3 === "pose")) {
                                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5, schemaPath: "#/properties/thirdParty/items/properties/items/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" }];
                                                            return false;
                                                            break;
                                                          }
                                                        }
                                                        if (_errs58 === errors) {
                                                          if (data23.kind !== void 0) {
                                                            let data26 = data23.kind;
                                                            const _errs59 = errors;
                                                            if (!(data26 === "action" || data26 === "pose")) {
                                                              validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/kind", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/kind/enum", keyword: "enum", params: { allowedValues: schema11.properties.thirdParty.items.properties.items.items.properties.kind.enum }, message: "must be equal to one of the allowed values" }];
                                                              return false;
                                                            }
                                                            var valid16 = _errs59 === errors;
                                                          } else {
                                                            var valid16 = true;
                                                          }
                                                          if (valid16) {
                                                            if (data23.name !== void 0) {
                                                              const _errs60 = errors;
                                                              if (typeof data23.name !== "string") {
                                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/name", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                                return false;
                                                              }
                                                              var valid16 = _errs60 === errors;
                                                            } else {
                                                              var valid16 = true;
                                                            }
                                                            if (valid16) {
                                                              if (data23.transition !== void 0) {
                                                                let data28 = data23.transition;
                                                                const _errs62 = errors;
                                                                if (errors === _errs62) {
                                                                  if (typeof data28 == "number") {
                                                                    if (data28 > 5 || isNaN(data28)) {
                                                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/transition", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/transition/maximum", keyword: "maximum", params: { comparison: "<=", limit: 5 }, message: "must be <= 5" }];
                                                                      return false;
                                                                    } else {
                                                                      if (data28 < 0 || isNaN(data28)) {
                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/transition", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/transition/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                        return false;
                                                                      }
                                                                    }
                                                                  } else {
                                                                    validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/transition", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/transition/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                    return false;
                                                                  }
                                                                }
                                                                var valid16 = _errs62 === errors;
                                                              } else {
                                                                var valid16 = true;
                                                              }
                                                              if (valid16) {
                                                                if (data23.clipIndex !== void 0) {
                                                                  let data29 = data23.clipIndex;
                                                                  const _errs64 = errors;
                                                                  if (!(typeof data29 == "number" && (!(data29 % 1) && !isNaN(data29)))) {
                                                                    validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/clipIndex", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/clipIndex/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                                                                    return false;
                                                                  }
                                                                  if (errors === _errs64) {
                                                                    if (typeof data29 == "number") {
                                                                      if (data29 < 0 || isNaN(data29)) {
                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/clipIndex", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/clipIndex/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                        return false;
                                                                      }
                                                                    }
                                                                  }
                                                                  var valid16 = _errs64 === errors;
                                                                } else {
                                                                  var valid16 = true;
                                                                }
                                                                if (valid16) {
                                                                  if (data23.in !== void 0) {
                                                                    let data30 = data23.in;
                                                                    const _errs66 = errors;
                                                                    if (errors === _errs66) {
                                                                      if (typeof data30 == "number") {
                                                                        if (data30 < 0 || isNaN(data30)) {
                                                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/in", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/in/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                          return false;
                                                                        }
                                                                      } else {
                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/in", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/in/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                        return false;
                                                                      }
                                                                    }
                                                                    var valid16 = _errs66 === errors;
                                                                  } else {
                                                                    var valid16 = true;
                                                                  }
                                                                  if (valid16) {
                                                                    if (data23.out !== void 0) {
                                                                      let data31 = data23.out;
                                                                      const _errs68 = errors;
                                                                      if (errors === _errs68) {
                                                                        if (typeof data31 == "number") {
                                                                          if (data31 <= 0 || isNaN(data31)) {
                                                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/out", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/out/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                                            return false;
                                                                          }
                                                                        } else {
                                                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/out", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/out/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                          return false;
                                                                        }
                                                                      }
                                                                      var valid16 = _errs68 === errors;
                                                                    } else {
                                                                      var valid16 = true;
                                                                    }
                                                                    if (valid16) {
                                                                      if (data23.duration !== void 0) {
                                                                        let data32 = data23.duration;
                                                                        const _errs70 = errors;
                                                                        if (errors === _errs70) {
                                                                          if (typeof data32 == "number") {
                                                                            if (data32 > 300 || isNaN(data32)) {
                                                                              validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/duration", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/duration/maximum", keyword: "maximum", params: { comparison: "<=", limit: 300 }, message: "must be <= 300" }];
                                                                              return false;
                                                                            } else {
                                                                              if (data32 <= 0 || isNaN(data32)) {
                                                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/duration", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/duration/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                                                return false;
                                                                              }
                                                                            }
                                                                          } else {
                                                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/duration", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/duration/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                            return false;
                                                                          }
                                                                        }
                                                                        var valid16 = _errs70 === errors;
                                                                      } else {
                                                                        var valid16 = true;
                                                                      }
                                                                      if (valid16) {
                                                                        if (data23.pose !== void 0) {
                                                                          let data33 = data23.pose;
                                                                          const _errs72 = errors;
                                                                          if (errors === _errs72) {
                                                                            if (Array.isArray(data33)) {
                                                                              if (data33.length < 1) {
                                                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                                                return false;
                                                                              } else {
                                                                                var valid17 = true;
                                                                                const len6 = data33.length;
                                                                                for (let i6 = 0; i6 < len6; i6++) {
                                                                                  let data34 = data33[i6];
                                                                                  const _errs74 = errors;
                                                                                  if (errors === _errs74) {
                                                                                    if (data34 && typeof data34 == "object" && !Array.isArray(data34)) {
                                                                                      let missing8;
                                                                                      if (data34.p === void 0 && (missing8 = "p") || data34.q === void 0 && (missing8 = "q") || data34.s === void 0 && (missing8 = "s")) {
                                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6, schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/required", keyword: "required", params: { missingProperty: missing8 }, message: "must have required property '" + missing8 + "'" }];
                                                                                        return false;
                                                                                      } else {
                                                                                        if (data34.p !== void 0) {
                                                                                          let data35 = data34.p;
                                                                                          const _errs76 = errors;
                                                                                          if (errors === _errs76) {
                                                                                            if (Array.isArray(data35)) {
                                                                                              if (data35.length > 3) {
                                                                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/p", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/p/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                                                return false;
                                                                                              } else {
                                                                                                if (data35.length < 3) {
                                                                                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/p", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/p/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                                                  return false;
                                                                                                } else {
                                                                                                  var valid19 = true;
                                                                                                  const len7 = data35.length;
                                                                                                  for (let i7 = 0; i7 < len7; i7++) {
                                                                                                    const _errs78 = errors;
                                                                                                    if (!(typeof data35[i7] == "number")) {
                                                                                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/p/" + i7, schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/p/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                      return false;
                                                                                                    }
                                                                                                    var valid19 = _errs78 === errors;
                                                                                                    if (!valid19) {
                                                                                                      break;
                                                                                                    }
                                                                                                  }
                                                                                                }
                                                                                              }
                                                                                            } else {
                                                                                              validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/p", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/p/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                              return false;
                                                                                            }
                                                                                          }
                                                                                          var valid18 = _errs76 === errors;
                                                                                        } else {
                                                                                          var valid18 = true;
                                                                                        }
                                                                                        if (valid18) {
                                                                                          if (data34.q !== void 0) {
                                                                                            let data37 = data34.q;
                                                                                            const _errs80 = errors;
                                                                                            if (errors === _errs80) {
                                                                                              if (Array.isArray(data37)) {
                                                                                                if (data37.length > 4) {
                                                                                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/q", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/q/maxItems", keyword: "maxItems", params: { limit: 4 }, message: "must NOT have more than 4 items" }];
                                                                                                  return false;
                                                                                                } else {
                                                                                                  if (data37.length < 4) {
                                                                                                    validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/q", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/q/minItems", keyword: "minItems", params: { limit: 4 }, message: "must NOT have fewer than 4 items" }];
                                                                                                    return false;
                                                                                                  } else {
                                                                                                    var valid20 = true;
                                                                                                    const len8 = data37.length;
                                                                                                    for (let i8 = 0; i8 < len8; i8++) {
                                                                                                      const _errs82 = errors;
                                                                                                      if (!(typeof data37[i8] == "number")) {
                                                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/q/" + i8, schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/q/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                        return false;
                                                                                                      }
                                                                                                      var valid20 = _errs82 === errors;
                                                                                                      if (!valid20) {
                                                                                                        break;
                                                                                                      }
                                                                                                    }
                                                                                                  }
                                                                                                }
                                                                                              } else {
                                                                                                validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/q", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/q/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                                return false;
                                                                                              }
                                                                                            }
                                                                                            var valid18 = _errs80 === errors;
                                                                                          } else {
                                                                                            var valid18 = true;
                                                                                          }
                                                                                          if (valid18) {
                                                                                            if (data34.s !== void 0) {
                                                                                              let data39 = data34.s;
                                                                                              const _errs84 = errors;
                                                                                              if (errors === _errs84) {
                                                                                                if (Array.isArray(data39)) {
                                                                                                  if (data39.length > 3) {
                                                                                                    validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/s", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/s/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                                                    return false;
                                                                                                  } else {
                                                                                                    if (data39.length < 3) {
                                                                                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/s", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/s/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                                                      return false;
                                                                                                    } else {
                                                                                                      var valid21 = true;
                                                                                                      const len9 = data39.length;
                                                                                                      for (let i9 = 0; i9 < len9; i9++) {
                                                                                                        const _errs86 = errors;
                                                                                                        if (!(typeof data39[i9] == "number")) {
                                                                                                          validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/s/" + i9, schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/s/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                          return false;
                                                                                                        }
                                                                                                        var valid21 = _errs86 === errors;
                                                                                                        if (!valid21) {
                                                                                                          break;
                                                                                                        }
                                                                                                      }
                                                                                                    }
                                                                                                  }
                                                                                                } else {
                                                                                                  validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/s", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/s/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                                  return false;
                                                                                                }
                                                                                              }
                                                                                              var valid18 = _errs84 === errors;
                                                                                            } else {
                                                                                              var valid18 = true;
                                                                                            }
                                                                                            if (valid18) {
                                                                                              if (data34.m !== void 0) {
                                                                                                let data41 = data34.m;
                                                                                                const _errs88 = errors;
                                                                                                if (errors === _errs88) {
                                                                                                  if (Array.isArray(data41)) {
                                                                                                    var valid22 = true;
                                                                                                    const len10 = data41.length;
                                                                                                    for (let i10 = 0; i10 < len10; i10++) {
                                                                                                      const _errs90 = errors;
                                                                                                      if (!(typeof data41[i10] == "number")) {
                                                                                                        validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/m/" + i10, schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/m/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                        return false;
                                                                                                      }
                                                                                                      var valid22 = _errs90 === errors;
                                                                                                      if (!valid22) {
                                                                                                        break;
                                                                                                      }
                                                                                                    }
                                                                                                  } else {
                                                                                                    validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6 + "/m", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/properties/m/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                                    return false;
                                                                                                  }
                                                                                                }
                                                                                                var valid18 = _errs88 === errors;
                                                                                              } else {
                                                                                                var valid18 = true;
                                                                                              }
                                                                                            }
                                                                                          }
                                                                                        }
                                                                                      }
                                                                                    } else {
                                                                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose/" + i6, schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                                                      return false;
                                                                                    }
                                                                                  }
                                                                                  var valid17 = _errs74 === errors;
                                                                                  if (!valid17) {
                                                                                    break;
                                                                                  }
                                                                                }
                                                                              }
                                                                            } else {
                                                                              validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5 + "/pose", schemaPath: "#/properties/thirdParty/items/properties/items/items/properties/pose/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                              return false;
                                                                            }
                                                                          }
                                                                          var valid16 = _errs72 === errors;
                                                                        } else {
                                                                          var valid16 = true;
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    } else {
                                                      validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items/" + i5, schemaPath: "#/properties/thirdParty/items/properties/items/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                      return false;
                                                    }
                                                  }
                                                  var valid10 = _errs46 === errors;
                                                  if (!valid10) {
                                                    break;
                                                  }
                                                }
                                              }
                                            }
                                          } else {
                                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0 + "/items", schemaPath: "#/properties/thirdParty/items/properties/items/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                            return false;
                                          }
                                        }
                                        var valid3 = _errs44 === errors;
                                      } else {
                                        var valid3 = true;
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          } else {
                            validate10.errors = [{ instancePath: instancePath + "/thirdParty/" + i0, schemaPath: "#/properties/thirdParty/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                            return false;
                          }
                        }
                        var valid2 = _errs11 === errors;
                        if (!valid2) {
                          break;
                        }
                      }
                    }
                  } else {
                    validate10.errors = [{ instancePath: instancePath + "/thirdParty", schemaPath: "#/properties/thirdParty/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                    return false;
                  }
                }
                var valid0 = _errs9 === errors;
              } else {
                var valid0 = true;
              }
              if (valid0) {
                if (data.version !== void 0) {
                  let data43 = data.version;
                  const _errs92 = errors;
                  if (!(data43 === 1 || data43 === 2)) {
                    validate10.errors = [{ instancePath: instancePath + "/version", schemaPath: "#/properties/version/enum", keyword: "enum", params: { allowedValues: schema11.properties.version.enum }, message: "must be equal to one of the allowed values" }];
                    return false;
                  }
                  var valid0 = _errs92 === errors;
                } else {
                  var valid0 = true;
                }
                if (valid0) {
                  if (data.modelKey !== void 0) {
                    let data44 = data.modelKey;
                    const _errs93 = errors;
                    if (errors === _errs93) {
                      if (typeof data44 === "string") {
                        if (!pattern0.test(data44)) {
                          validate10.errors = [{ instancePath: instancePath + "/modelKey", schemaPath: "#/properties/modelKey/pattern", keyword: "pattern", params: { pattern: "^[a-f0-9]{64}$" }, message: 'must match pattern "^[a-f0-9]{64}$"' }];
                          return false;
                        }
                      } else {
                        validate10.errors = [{ instancePath: instancePath + "/modelKey", schemaPath: "#/properties/modelKey/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                        return false;
                      }
                    }
                    var valid0 = _errs93 === errors;
                  } else {
                    var valid0 = true;
                  }
                  if (valid0) {
                    if (data.actions !== void 0) {
                      let data45 = data.actions;
                      const _errs95 = errors;
                      if (errors === _errs95) {
                        if (Array.isArray(data45)) {
                          if (data45.length > 200) {
                            validate10.errors = [{ instancePath: instancePath + "/actions", schemaPath: "#/properties/actions/maxItems", keyword: "maxItems", params: { limit: 200 }, message: "must NOT have more than 200 items" }];
                            return false;
                          } else {
                            var valid23 = true;
                            const len11 = data45.length;
                            for (let i11 = 0; i11 < len11; i11++) {
                              let data46 = data45[i11];
                              const _errs97 = errors;
                              if (errors === _errs97) {
                                if (data46 && typeof data46 == "object" && !Array.isArray(data46)) {
                                  let missing9;
                                  if (data46.id === void 0 && (missing9 = "id") || data46.name === void 0 && (missing9 = "name") || data46.clips === void 0 && (missing9 = "clips") || data46.items === void 0 && (missing9 = "items")) {
                                    validate10.errors = [{ instancePath: instancePath + "/actions/" + i11, schemaPath: "#/properties/actions/items/required", keyword: "required", params: { missingProperty: missing9 }, message: "must have required property '" + missing9 + "'" }];
                                    return false;
                                  } else {
                                    const _errs99 = errors;
                                    for (const key4 in data46) {
                                      if (!(key4 === "id" || key4 === "name" || key4 === "clips" || key4 === "items")) {
                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11, schemaPath: "#/properties/actions/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" }];
                                        return false;
                                        break;
                                      }
                                    }
                                    if (_errs99 === errors) {
                                      if (data46.id !== void 0) {
                                        let data47 = data46.id;
                                        const _errs100 = errors;
                                        if (errors === _errs100) {
                                          if (typeof data47 === "string") {
                                            if (func2(data47) < 1) {
                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/id", schemaPath: "#/properties/actions/items/properties/id/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                                              return false;
                                            }
                                          } else {
                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/id", schemaPath: "#/properties/actions/items/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                            return false;
                                          }
                                        }
                                        var valid24 = _errs100 === errors;
                                      } else {
                                        var valid24 = true;
                                      }
                                      if (valid24) {
                                        if (data46.name !== void 0) {
                                          let data48 = data46.name;
                                          const _errs102 = errors;
                                          if (errors === _errs102) {
                                            if (typeof data48 === "string") {
                                              if (func2(data48) > 80) {
                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/name", schemaPath: "#/properties/actions/items/properties/name/maxLength", keyword: "maxLength", params: { limit: 80 }, message: "must NOT have more than 80 characters" }];
                                                return false;
                                              } else {
                                                if (func2(data48) < 1) {
                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/name", schemaPath: "#/properties/actions/items/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                                                  return false;
                                                }
                                              }
                                            } else {
                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/name", schemaPath: "#/properties/actions/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                              return false;
                                            }
                                          }
                                          var valid24 = _errs102 === errors;
                                        } else {
                                          var valid24 = true;
                                        }
                                        if (valid24) {
                                          if (data46.clips !== void 0) {
                                            let data49 = data46.clips;
                                            const _errs104 = errors;
                                            if (errors === _errs104) {
                                              if (Array.isArray(data49)) {
                                                var valid25 = true;
                                                const len12 = data49.length;
                                                for (let i12 = 0; i12 < len12; i12++) {
                                                  let data50 = data49[i12];
                                                  const _errs106 = errors;
                                                  if (errors === _errs106) {
                                                    if (data50 && typeof data50 == "object" && !Array.isArray(data50)) {
                                                      let missing10;
                                                      if (data50.name === void 0 && (missing10 = "name") || data50.duration === void 0 && (missing10 = "duration") || data50.tracks === void 0 && (missing10 = "tracks")) {
                                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12, schemaPath: "#/properties/actions/items/properties/clips/items/required", keyword: "required", params: { missingProperty: missing10 }, message: "must have required property '" + missing10 + "'" }];
                                                        return false;
                                                      } else {
                                                        if (data50.name !== void 0) {
                                                          const _errs108 = errors;
                                                          if (typeof data50.name !== "string") {
                                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/name", schemaPath: "#/properties/actions/items/properties/clips/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                            return false;
                                                          }
                                                          var valid26 = _errs108 === errors;
                                                        } else {
                                                          var valid26 = true;
                                                        }
                                                        if (valid26) {
                                                          if (data50.duration !== void 0) {
                                                            let data52 = data50.duration;
                                                            const _errs110 = errors;
                                                            if (errors === _errs110) {
                                                              if (typeof data52 == "number") {
                                                                if (data52 <= 0 || isNaN(data52)) {
                                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/duration", schemaPath: "#/properties/actions/items/properties/clips/items/properties/duration/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                                  return false;
                                                                }
                                                              } else {
                                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/duration", schemaPath: "#/properties/actions/items/properties/clips/items/properties/duration/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                return false;
                                                              }
                                                            }
                                                            var valid26 = _errs110 === errors;
                                                          } else {
                                                            var valid26 = true;
                                                          }
                                                          if (valid26) {
                                                            if (data50.tracks !== void 0) {
                                                              let data53 = data50.tracks;
                                                              const _errs112 = errors;
                                                              if (errors === _errs112) {
                                                                if (Array.isArray(data53)) {
                                                                  var valid27 = true;
                                                                  const len13 = data53.length;
                                                                  for (let i13 = 0; i13 < len13; i13++) {
                                                                    let data54 = data53[i13];
                                                                    const _errs114 = errors;
                                                                    if (errors === _errs114) {
                                                                      if (data54 && typeof data54 == "object" && !Array.isArray(data54)) {
                                                                        let missing11;
                                                                        if (data54.name === void 0 && (missing11 = "name") || data54.type === void 0 && (missing11 = "type") || data54.times === void 0 && (missing11 = "times") || data54.values === void 0 && (missing11 = "values")) {
                                                                          validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13, schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/required", keyword: "required", params: { missingProperty: missing11 }, message: "must have required property '" + missing11 + "'" }];
                                                                          return false;
                                                                        } else {
                                                                          if (data54.name !== void 0) {
                                                                            const _errs116 = errors;
                                                                            if (typeof data54.name !== "string") {
                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/name", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                                              return false;
                                                                            }
                                                                            var valid28 = _errs116 === errors;
                                                                          } else {
                                                                            var valid28 = true;
                                                                          }
                                                                          if (valid28) {
                                                                            if (data54.nodeIndex !== void 0) {
                                                                              let data56 = data54.nodeIndex;
                                                                              const _errs118 = errors;
                                                                              if (!(typeof data56 == "number" && (!(data56 % 1) && !isNaN(data56)))) {
                                                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/nodeIndex", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/nodeIndex/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                                                                                return false;
                                                                              }
                                                                              if (errors === _errs118) {
                                                                                if (typeof data56 == "number") {
                                                                                  if (data56 < 0 || isNaN(data56)) {
                                                                                    validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/nodeIndex", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/nodeIndex/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                                    return false;
                                                                                  }
                                                                                }
                                                                              }
                                                                              var valid28 = _errs118 === errors;
                                                                            } else {
                                                                              var valid28 = true;
                                                                            }
                                                                            if (valid28) {
                                                                              if (data54.type !== void 0) {
                                                                                let data57 = data54.type;
                                                                                const _errs120 = errors;
                                                                                if (!(data57 === "vector" || data57 === "quaternion" || data57 === "number" || data57 === "bool" || data57 === "color" || data57 === "string")) {
                                                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/type", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/type/enum", keyword: "enum", params: { allowedValues: schema11.properties.actions.items.properties.clips.items.properties.tracks.items.properties.type.enum }, message: "must be equal to one of the allowed values" }];
                                                                                  return false;
                                                                                }
                                                                                var valid28 = _errs120 === errors;
                                                                              } else {
                                                                                var valid28 = true;
                                                                              }
                                                                              if (valid28) {
                                                                                if (data54.times !== void 0) {
                                                                                  let data58 = data54.times;
                                                                                  const _errs121 = errors;
                                                                                  if (errors === _errs121) {
                                                                                    if (Array.isArray(data58)) {
                                                                                      if (data58.length < 1) {
                                                                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/times", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/times/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                                                        return false;
                                                                                      } else {
                                                                                        var valid29 = true;
                                                                                        const len14 = data58.length;
                                                                                        for (let i14 = 0; i14 < len14; i14++) {
                                                                                          const _errs123 = errors;
                                                                                          if (!(typeof data58[i14] == "number")) {
                                                                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/times/" + i14, schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/times/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                            return false;
                                                                                          }
                                                                                          var valid29 = _errs123 === errors;
                                                                                          if (!valid29) {
                                                                                            break;
                                                                                          }
                                                                                        }
                                                                                      }
                                                                                    } else {
                                                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/times", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/times/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                      return false;
                                                                                    }
                                                                                  }
                                                                                  var valid28 = _errs121 === errors;
                                                                                } else {
                                                                                  var valid28 = true;
                                                                                }
                                                                                if (valid28) {
                                                                                  if (data54.values !== void 0) {
                                                                                    let data60 = data54.values;
                                                                                    const _errs125 = errors;
                                                                                    if (errors === _errs125) {
                                                                                      if (Array.isArray(data60)) {
                                                                                        if (data60.length < 1) {
                                                                                          validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/values", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/values/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                                                          return false;
                                                                                        } else {
                                                                                          var valid30 = true;
                                                                                          const len15 = data60.length;
                                                                                          for (let i15 = 0; i15 < len15; i15++) {
                                                                                            let data61 = data60[i15];
                                                                                            const _errs127 = errors;
                                                                                            if (!(typeof data61 == "number") && typeof data61 !== "string" && typeof data61 !== "boolean") {
                                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/values/" + i15, schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/values/items/type", keyword: "type", params: { type: schema11.properties.actions.items.properties.clips.items.properties.tracks.items.properties.values.items.type }, message: "must be number,string,boolean" }];
                                                                                              return false;
                                                                                            }
                                                                                            var valid30 = _errs127 === errors;
                                                                                            if (!valid30) {
                                                                                              break;
                                                                                            }
                                                                                          }
                                                                                        }
                                                                                      } else {
                                                                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13 + "/values", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/properties/values/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                        return false;
                                                                                      }
                                                                                    }
                                                                                    var valid28 = _errs125 === errors;
                                                                                  } else {
                                                                                    var valid28 = true;
                                                                                  }
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      } else {
                                                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks/" + i13, schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                                        return false;
                                                                      }
                                                                    }
                                                                    var valid27 = _errs114 === errors;
                                                                    if (!valid27) {
                                                                      break;
                                                                    }
                                                                  }
                                                                } else {
                                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/tracks", schemaPath: "#/properties/actions/items/properties/clips/items/properties/tracks/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                  return false;
                                                                }
                                                              }
                                                              var valid26 = _errs112 === errors;
                                                            } else {
                                                              var valid26 = true;
                                                            }
                                                            if (valid26) {
                                                              if (data50.recipe !== void 0) {
                                                                const _errs129 = errors;
                                                                if (!validate11(data50.recipe, { instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12 + "/recipe", parentData: data50, parentDataProperty: "recipe", rootData })) {
                                                                  vErrors = vErrors === null ? validate11.errors : vErrors.concat(validate11.errors);
                                                                  errors = vErrors.length;
                                                                }
                                                                var valid26 = _errs129 === errors;
                                                              } else {
                                                                var valid26 = true;
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    } else {
                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips/" + i12, schemaPath: "#/properties/actions/items/properties/clips/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                      return false;
                                                    }
                                                  }
                                                  var valid25 = _errs106 === errors;
                                                  if (!valid25) {
                                                    break;
                                                  }
                                                }
                                              } else {
                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/clips", schemaPath: "#/properties/actions/items/properties/clips/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                return false;
                                              }
                                            }
                                            var valid24 = _errs104 === errors;
                                          } else {
                                            var valid24 = true;
                                          }
                                          if (valid24) {
                                            if (data46.items !== void 0) {
                                              let data63 = data46.items;
                                              const _errs130 = errors;
                                              if (errors === _errs130) {
                                                if (Array.isArray(data63)) {
                                                  if (data63.length > 1e3) {
                                                    validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items", schemaPath: "#/properties/actions/items/properties/items/maxItems", keyword: "maxItems", params: { limit: 1e3 }, message: "must NOT have more than 1000 items" }];
                                                    return false;
                                                  } else {
                                                    if (data63.length < 1) {
                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items", schemaPath: "#/properties/actions/items/properties/items/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                      return false;
                                                    } else {
                                                      var valid31 = true;
                                                      const len16 = data63.length;
                                                      for (let i16 = 0; i16 < len16; i16++) {
                                                        let data64 = data63[i16];
                                                        const _errs132 = errors;
                                                        const _errs134 = errors;
                                                        const _errs135 = errors;
                                                        let valid33 = true;
                                                        const _errs136 = errors;
                                                        if (data64 && typeof data64 == "object" && !Array.isArray(data64)) {
                                                          if (data64.kind !== void 0) {
                                                            if ("action" !== data64.kind) {
                                                              const err4 = {};
                                                              if (vErrors === null) {
                                                                vErrors = [err4];
                                                              } else {
                                                                vErrors.push(err4);
                                                              }
                                                              errors++;
                                                            }
                                                          }
                                                        }
                                                        var _valid2 = _errs136 === errors;
                                                        errors = _errs135;
                                                        if (vErrors !== null) {
                                                          if (_errs135) {
                                                            vErrors.length = _errs135;
                                                          } else {
                                                            vErrors = null;
                                                          }
                                                        }
                                                        if (_valid2) {
                                                          const _errs138 = errors;
                                                          if (data64 && typeof data64 == "object" && !Array.isArray(data64)) {
                                                            let missing12;
                                                            if (data64.clipIndex === void 0 && (missing12 = "clipIndex")) {
                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16, schemaPath: "#/properties/actions/items/properties/items/items/allOf/0/then/required", keyword: "required", params: { missingProperty: missing12 }, message: "must have required property '" + missing12 + "'" }];
                                                              return false;
                                                            }
                                                          }
                                                          var _valid2 = _errs138 === errors;
                                                          valid33 = _valid2;
                                                        }
                                                        if (!valid33) {
                                                          const err5 = { instancePath: instancePath + "/actions/" + i11 + "/items/" + i16, schemaPath: "#/properties/actions/items/properties/items/items/allOf/0/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                                                          if (vErrors === null) {
                                                            vErrors = [err5];
                                                          } else {
                                                            vErrors.push(err5);
                                                          }
                                                          errors++;
                                                          validate10.errors = vErrors;
                                                          return false;
                                                        }
                                                        var valid32 = _errs134 === errors;
                                                        if (valid32) {
                                                          const _errs139 = errors;
                                                          const _errs140 = errors;
                                                          let valid35 = true;
                                                          const _errs141 = errors;
                                                          if (data64 && typeof data64 == "object" && !Array.isArray(data64)) {
                                                            if (data64.kind !== void 0) {
                                                              if ("pose" !== data64.kind) {
                                                                const err6 = {};
                                                                if (vErrors === null) {
                                                                  vErrors = [err6];
                                                                } else {
                                                                  vErrors.push(err6);
                                                                }
                                                                errors++;
                                                              }
                                                            }
                                                          }
                                                          var _valid3 = _errs141 === errors;
                                                          errors = _errs140;
                                                          if (vErrors !== null) {
                                                            if (_errs140) {
                                                              vErrors.length = _errs140;
                                                            } else {
                                                              vErrors = null;
                                                            }
                                                          }
                                                          if (_valid3) {
                                                            const _errs143 = errors;
                                                            if (data64 && typeof data64 == "object" && !Array.isArray(data64)) {
                                                              let missing13;
                                                              if (data64.pose === void 0 && (missing13 = "pose") || data64.duration === void 0 && (missing13 = "duration")) {
                                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16, schemaPath: "#/properties/actions/items/properties/items/items/allOf/1/then/required", keyword: "required", params: { missingProperty: missing13 }, message: "must have required property '" + missing13 + "'" }];
                                                                return false;
                                                              }
                                                            }
                                                            var _valid3 = _errs143 === errors;
                                                            valid35 = _valid3;
                                                          }
                                                          if (!valid35) {
                                                            const err7 = { instancePath: instancePath + "/actions/" + i11 + "/items/" + i16, schemaPath: "#/properties/actions/items/properties/items/items/allOf/1/if", keyword: "if", params: { failingKeyword: "then" }, message: 'must match "then" schema' };
                                                            if (vErrors === null) {
                                                              vErrors = [err7];
                                                            } else {
                                                              vErrors.push(err7);
                                                            }
                                                            errors++;
                                                            validate10.errors = vErrors;
                                                            return false;
                                                          }
                                                          var valid32 = _errs139 === errors;
                                                        }
                                                        if (errors === _errs132) {
                                                          if (data64 && typeof data64 == "object" && !Array.isArray(data64)) {
                                                            let missing14;
                                                            if (data64.kind === void 0 && (missing14 = "kind") || data64.name === void 0 && (missing14 = "name") || data64.transition === void 0 && (missing14 = "transition")) {
                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16, schemaPath: "#/properties/actions/items/properties/items/items/required", keyword: "required", params: { missingProperty: missing14 }, message: "must have required property '" + missing14 + "'" }];
                                                              return false;
                                                            } else {
                                                              const _errs144 = errors;
                                                              for (const key5 in data64) {
                                                                if (!(key5 === "kind" || key5 === "name" || key5 === "transition" || key5 === "clipIndex" || key5 === "in" || key5 === "out" || key5 === "duration" || key5 === "pose")) {
                                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16, schemaPath: "#/properties/actions/items/properties/items/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key5 }, message: "must NOT have additional properties" }];
                                                                  return false;
                                                                  break;
                                                                }
                                                              }
                                                              if (_errs144 === errors) {
                                                                if (data64.kind !== void 0) {
                                                                  let data67 = data64.kind;
                                                                  const _errs145 = errors;
                                                                  if (!(data67 === "action" || data67 === "pose")) {
                                                                    validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/kind", schemaPath: "#/properties/actions/items/properties/items/items/properties/kind/enum", keyword: "enum", params: { allowedValues: schema11.properties.actions.items.properties.items.items.properties.kind.enum }, message: "must be equal to one of the allowed values" }];
                                                                    return false;
                                                                  }
                                                                  var valid37 = _errs145 === errors;
                                                                } else {
                                                                  var valid37 = true;
                                                                }
                                                                if (valid37) {
                                                                  if (data64.name !== void 0) {
                                                                    const _errs146 = errors;
                                                                    if (typeof data64.name !== "string") {
                                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/name", schemaPath: "#/properties/actions/items/properties/items/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                                      return false;
                                                                    }
                                                                    var valid37 = _errs146 === errors;
                                                                  } else {
                                                                    var valid37 = true;
                                                                  }
                                                                  if (valid37) {
                                                                    if (data64.transition !== void 0) {
                                                                      let data69 = data64.transition;
                                                                      const _errs148 = errors;
                                                                      if (errors === _errs148) {
                                                                        if (typeof data69 == "number") {
                                                                          if (data69 > 5 || isNaN(data69)) {
                                                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/transition", schemaPath: "#/properties/actions/items/properties/items/items/properties/transition/maximum", keyword: "maximum", params: { comparison: "<=", limit: 5 }, message: "must be <= 5" }];
                                                                            return false;
                                                                          } else {
                                                                            if (data69 < 0 || isNaN(data69)) {
                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/transition", schemaPath: "#/properties/actions/items/properties/items/items/properties/transition/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                              return false;
                                                                            }
                                                                          }
                                                                        } else {
                                                                          validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/transition", schemaPath: "#/properties/actions/items/properties/items/items/properties/transition/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                          return false;
                                                                        }
                                                                      }
                                                                      var valid37 = _errs148 === errors;
                                                                    } else {
                                                                      var valid37 = true;
                                                                    }
                                                                    if (valid37) {
                                                                      if (data64.clipIndex !== void 0) {
                                                                        let data70 = data64.clipIndex;
                                                                        const _errs150 = errors;
                                                                        if (!(typeof data70 == "number" && (!(data70 % 1) && !isNaN(data70)))) {
                                                                          validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/clipIndex", schemaPath: "#/properties/actions/items/properties/items/items/properties/clipIndex/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                                                                          return false;
                                                                        }
                                                                        if (errors === _errs150) {
                                                                          if (typeof data70 == "number") {
                                                                            if (data70 < 0 || isNaN(data70)) {
                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/clipIndex", schemaPath: "#/properties/actions/items/properties/items/items/properties/clipIndex/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                              return false;
                                                                            }
                                                                          }
                                                                        }
                                                                        var valid37 = _errs150 === errors;
                                                                      } else {
                                                                        var valid37 = true;
                                                                      }
                                                                      if (valid37) {
                                                                        if (data64.in !== void 0) {
                                                                          let data71 = data64.in;
                                                                          const _errs152 = errors;
                                                                          if (errors === _errs152) {
                                                                            if (typeof data71 == "number") {
                                                                              if (data71 < 0 || isNaN(data71)) {
                                                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/in", schemaPath: "#/properties/actions/items/properties/items/items/properties/in/minimum", keyword: "minimum", params: { comparison: ">=", limit: 0 }, message: "must be >= 0" }];
                                                                                return false;
                                                                              }
                                                                            } else {
                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/in", schemaPath: "#/properties/actions/items/properties/items/items/properties/in/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                              return false;
                                                                            }
                                                                          }
                                                                          var valid37 = _errs152 === errors;
                                                                        } else {
                                                                          var valid37 = true;
                                                                        }
                                                                        if (valid37) {
                                                                          if (data64.out !== void 0) {
                                                                            let data72 = data64.out;
                                                                            const _errs154 = errors;
                                                                            if (errors === _errs154) {
                                                                              if (typeof data72 == "number") {
                                                                                if (data72 <= 0 || isNaN(data72)) {
                                                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/out", schemaPath: "#/properties/actions/items/properties/items/items/properties/out/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                                                  return false;
                                                                                }
                                                                              } else {
                                                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/out", schemaPath: "#/properties/actions/items/properties/items/items/properties/out/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                return false;
                                                                              }
                                                                            }
                                                                            var valid37 = _errs154 === errors;
                                                                          } else {
                                                                            var valid37 = true;
                                                                          }
                                                                          if (valid37) {
                                                                            if (data64.duration !== void 0) {
                                                                              let data73 = data64.duration;
                                                                              const _errs156 = errors;
                                                                              if (errors === _errs156) {
                                                                                if (typeof data73 == "number") {
                                                                                  if (data73 > 300 || isNaN(data73)) {
                                                                                    validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/duration", schemaPath: "#/properties/actions/items/properties/items/items/properties/duration/maximum", keyword: "maximum", params: { comparison: "<=", limit: 300 }, message: "must be <= 300" }];
                                                                                    return false;
                                                                                  } else {
                                                                                    if (data73 <= 0 || isNaN(data73)) {
                                                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/duration", schemaPath: "#/properties/actions/items/properties/items/items/properties/duration/exclusiveMinimum", keyword: "exclusiveMinimum", params: { comparison: ">", limit: 0 }, message: "must be > 0" }];
                                                                                      return false;
                                                                                    }
                                                                                  }
                                                                                } else {
                                                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/duration", schemaPath: "#/properties/actions/items/properties/items/items/properties/duration/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                  return false;
                                                                                }
                                                                              }
                                                                              var valid37 = _errs156 === errors;
                                                                            } else {
                                                                              var valid37 = true;
                                                                            }
                                                                            if (valid37) {
                                                                              if (data64.pose !== void 0) {
                                                                                let data74 = data64.pose;
                                                                                const _errs158 = errors;
                                                                                if (errors === _errs158) {
                                                                                  if (Array.isArray(data74)) {
                                                                                    if (data74.length < 1) {
                                                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                                                      return false;
                                                                                    } else {
                                                                                      var valid38 = true;
                                                                                      const len17 = data74.length;
                                                                                      for (let i17 = 0; i17 < len17; i17++) {
                                                                                        let data75 = data74[i17];
                                                                                        const _errs160 = errors;
                                                                                        if (errors === _errs160) {
                                                                                          if (data75 && typeof data75 == "object" && !Array.isArray(data75)) {
                                                                                            let missing15;
                                                                                            if (data75.p === void 0 && (missing15 = "p") || data75.q === void 0 && (missing15 = "q") || data75.s === void 0 && (missing15 = "s")) {
                                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17, schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/required", keyword: "required", params: { missingProperty: missing15 }, message: "must have required property '" + missing15 + "'" }];
                                                                                              return false;
                                                                                            } else {
                                                                                              if (data75.p !== void 0) {
                                                                                                let data76 = data75.p;
                                                                                                const _errs162 = errors;
                                                                                                if (errors === _errs162) {
                                                                                                  if (Array.isArray(data76)) {
                                                                                                    if (data76.length > 3) {
                                                                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/p", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/p/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                                                      return false;
                                                                                                    } else {
                                                                                                      if (data76.length < 3) {
                                                                                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/p", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/p/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                                                        return false;
                                                                                                      } else {
                                                                                                        var valid40 = true;
                                                                                                        const len18 = data76.length;
                                                                                                        for (let i18 = 0; i18 < len18; i18++) {
                                                                                                          const _errs164 = errors;
                                                                                                          if (!(typeof data76[i18] == "number")) {
                                                                                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/p/" + i18, schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/p/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                            return false;
                                                                                                          }
                                                                                                          var valid40 = _errs164 === errors;
                                                                                                          if (!valid40) {
                                                                                                            break;
                                                                                                          }
                                                                                                        }
                                                                                                      }
                                                                                                    }
                                                                                                  } else {
                                                                                                    validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/p", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/p/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                                    return false;
                                                                                                  }
                                                                                                }
                                                                                                var valid39 = _errs162 === errors;
                                                                                              } else {
                                                                                                var valid39 = true;
                                                                                              }
                                                                                              if (valid39) {
                                                                                                if (data75.q !== void 0) {
                                                                                                  let data78 = data75.q;
                                                                                                  const _errs166 = errors;
                                                                                                  if (errors === _errs166) {
                                                                                                    if (Array.isArray(data78)) {
                                                                                                      if (data78.length > 4) {
                                                                                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/q", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/q/maxItems", keyword: "maxItems", params: { limit: 4 }, message: "must NOT have more than 4 items" }];
                                                                                                        return false;
                                                                                                      } else {
                                                                                                        if (data78.length < 4) {
                                                                                                          validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/q", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/q/minItems", keyword: "minItems", params: { limit: 4 }, message: "must NOT have fewer than 4 items" }];
                                                                                                          return false;
                                                                                                        } else {
                                                                                                          var valid41 = true;
                                                                                                          const len19 = data78.length;
                                                                                                          for (let i19 = 0; i19 < len19; i19++) {
                                                                                                            const _errs168 = errors;
                                                                                                            if (!(typeof data78[i19] == "number")) {
                                                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/q/" + i19, schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/q/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                              return false;
                                                                                                            }
                                                                                                            var valid41 = _errs168 === errors;
                                                                                                            if (!valid41) {
                                                                                                              break;
                                                                                                            }
                                                                                                          }
                                                                                                        }
                                                                                                      }
                                                                                                    } else {
                                                                                                      validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/q", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/q/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                                      return false;
                                                                                                    }
                                                                                                  }
                                                                                                  var valid39 = _errs166 === errors;
                                                                                                } else {
                                                                                                  var valid39 = true;
                                                                                                }
                                                                                                if (valid39) {
                                                                                                  if (data75.s !== void 0) {
                                                                                                    let data80 = data75.s;
                                                                                                    const _errs170 = errors;
                                                                                                    if (errors === _errs170) {
                                                                                                      if (Array.isArray(data80)) {
                                                                                                        if (data80.length > 3) {
                                                                                                          validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/s", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/s/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                                                          return false;
                                                                                                        } else {
                                                                                                          if (data80.length < 3) {
                                                                                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/s", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/s/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                                                            return false;
                                                                                                          } else {
                                                                                                            var valid42 = true;
                                                                                                            const len20 = data80.length;
                                                                                                            for (let i20 = 0; i20 < len20; i20++) {
                                                                                                              const _errs172 = errors;
                                                                                                              if (!(typeof data80[i20] == "number")) {
                                                                                                                validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/s/" + i20, schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/s/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                                return false;
                                                                                                              }
                                                                                                              var valid42 = _errs172 === errors;
                                                                                                              if (!valid42) {
                                                                                                                break;
                                                                                                              }
                                                                                                            }
                                                                                                          }
                                                                                                        }
                                                                                                      } else {
                                                                                                        validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/s", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/s/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                                        return false;
                                                                                                      }
                                                                                                    }
                                                                                                    var valid39 = _errs170 === errors;
                                                                                                  } else {
                                                                                                    var valid39 = true;
                                                                                                  }
                                                                                                  if (valid39) {
                                                                                                    if (data75.m !== void 0) {
                                                                                                      let data82 = data75.m;
                                                                                                      const _errs174 = errors;
                                                                                                      if (errors === _errs174) {
                                                                                                        if (Array.isArray(data82)) {
                                                                                                          var valid43 = true;
                                                                                                          const len21 = data82.length;
                                                                                                          for (let i21 = 0; i21 < len21; i21++) {
                                                                                                            const _errs176 = errors;
                                                                                                            if (!(typeof data82[i21] == "number")) {
                                                                                                              validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/m/" + i21, schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/m/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                                                              return false;
                                                                                                            }
                                                                                                            var valid43 = _errs176 === errors;
                                                                                                            if (!valid43) {
                                                                                                              break;
                                                                                                            }
                                                                                                          }
                                                                                                        } else {
                                                                                                          validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17 + "/m", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/properties/m/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                                          return false;
                                                                                                        }
                                                                                                      }
                                                                                                      var valid39 = _errs174 === errors;
                                                                                                    } else {
                                                                                                      var valid39 = true;
                                                                                                    }
                                                                                                  }
                                                                                                }
                                                                                              }
                                                                                            }
                                                                                          } else {
                                                                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose/" + i17, schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                                                            return false;
                                                                                          }
                                                                                        }
                                                                                        var valid38 = _errs160 === errors;
                                                                                        if (!valid38) {
                                                                                          break;
                                                                                        }
                                                                                      }
                                                                                    }
                                                                                  } else {
                                                                                    validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16 + "/pose", schemaPath: "#/properties/actions/items/properties/items/items/properties/pose/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                                    return false;
                                                                                  }
                                                                                }
                                                                                var valid37 = _errs158 === errors;
                                                                              } else {
                                                                                var valid37 = true;
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          } else {
                                                            validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items/" + i16, schemaPath: "#/properties/actions/items/properties/items/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                            return false;
                                                          }
                                                        }
                                                        var valid31 = _errs132 === errors;
                                                        if (!valid31) {
                                                          break;
                                                        }
                                                      }
                                                    }
                                                  }
                                                } else {
                                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11 + "/items", schemaPath: "#/properties/actions/items/properties/items/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                  return false;
                                                }
                                              }
                                              var valid24 = _errs130 === errors;
                                            } else {
                                              var valid24 = true;
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                } else {
                                  validate10.errors = [{ instancePath: instancePath + "/actions/" + i11, schemaPath: "#/properties/actions/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                  return false;
                                }
                              }
                              var valid23 = _errs97 === errors;
                              if (!valid23) {
                                break;
                              }
                            }
                          }
                        } else {
                          validate10.errors = [{ instancePath: instancePath + "/actions", schemaPath: "#/properties/actions/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                          return false;
                        }
                      }
                      var valid0 = _errs95 === errors;
                    } else {
                      var valid0 = true;
                    }
                    if (valid0) {
                      if (data.poses !== void 0) {
                        let data84 = data.poses;
                        const _errs178 = errors;
                        if (errors === _errs178) {
                          if (Array.isArray(data84)) {
                            if (data84.length > 500) {
                              validate10.errors = [{ instancePath: instancePath + "/poses", schemaPath: "#/properties/poses/maxItems", keyword: "maxItems", params: { limit: 500 }, message: "must NOT have more than 500 items" }];
                              return false;
                            } else {
                              var valid44 = true;
                              const len22 = data84.length;
                              for (let i22 = 0; i22 < len22; i22++) {
                                let data85 = data84[i22];
                                const _errs180 = errors;
                                if (errors === _errs180) {
                                  if (data85 && typeof data85 == "object" && !Array.isArray(data85)) {
                                    let missing16;
                                    if (data85.id === void 0 && (missing16 = "id") || data85.name === void 0 && (missing16 = "name") || data85.pose === void 0 && (missing16 = "pose")) {
                                      validate10.errors = [{ instancePath: instancePath + "/poses/" + i22, schemaPath: "#/properties/poses/items/required", keyword: "required", params: { missingProperty: missing16 }, message: "must have required property '" + missing16 + "'" }];
                                      return false;
                                    } else {
                                      const _errs182 = errors;
                                      for (const key6 in data85) {
                                        if (!(key6 === "id" || key6 === "name" || key6 === "pose")) {
                                          validate10.errors = [{ instancePath: instancePath + "/poses/" + i22, schemaPath: "#/properties/poses/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key6 }, message: "must NOT have additional properties" }];
                                          return false;
                                          break;
                                        }
                                      }
                                      if (_errs182 === errors) {
                                        if (data85.id !== void 0) {
                                          let data86 = data85.id;
                                          const _errs183 = errors;
                                          if (errors === _errs183) {
                                            if (typeof data86 === "string") {
                                              if (func2(data86) < 1) {
                                                validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/id", schemaPath: "#/properties/poses/items/properties/id/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                                                return false;
                                              }
                                            } else {
                                              validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/id", schemaPath: "#/properties/poses/items/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                              return false;
                                            }
                                          }
                                          var valid45 = _errs183 === errors;
                                        } else {
                                          var valid45 = true;
                                        }
                                        if (valid45) {
                                          if (data85.name !== void 0) {
                                            let data87 = data85.name;
                                            const _errs185 = errors;
                                            if (errors === _errs185) {
                                              if (typeof data87 === "string") {
                                                if (func2(data87) > 80) {
                                                  validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/name", schemaPath: "#/properties/poses/items/properties/name/maxLength", keyword: "maxLength", params: { limit: 80 }, message: "must NOT have more than 80 characters" }];
                                                  return false;
                                                } else {
                                                  if (func2(data87) < 1) {
                                                    validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/name", schemaPath: "#/properties/poses/items/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                                                    return false;
                                                  }
                                                }
                                              } else {
                                                validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/name", schemaPath: "#/properties/poses/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                                return false;
                                              }
                                            }
                                            var valid45 = _errs185 === errors;
                                          } else {
                                            var valid45 = true;
                                          }
                                          if (valid45) {
                                            if (data85.pose !== void 0) {
                                              let data88 = data85.pose;
                                              const _errs187 = errors;
                                              if (errors === _errs187) {
                                                if (Array.isArray(data88)) {
                                                  if (data88.length < 1) {
                                                    validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose", schemaPath: "#/properties/poses/items/properties/pose/minItems", keyword: "minItems", params: { limit: 1 }, message: "must NOT have fewer than 1 items" }];
                                                    return false;
                                                  } else {
                                                    var valid46 = true;
                                                    const len23 = data88.length;
                                                    for (let i23 = 0; i23 < len23; i23++) {
                                                      let data89 = data88[i23];
                                                      const _errs189 = errors;
                                                      if (errors === _errs189) {
                                                        if (data89 && typeof data89 == "object" && !Array.isArray(data89)) {
                                                          let missing17;
                                                          if (data89.p === void 0 && (missing17 = "p") || data89.q === void 0 && (missing17 = "q") || data89.s === void 0 && (missing17 = "s")) {
                                                            validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23, schemaPath: "#/properties/poses/items/properties/pose/items/required", keyword: "required", params: { missingProperty: missing17 }, message: "must have required property '" + missing17 + "'" }];
                                                            return false;
                                                          } else {
                                                            if (data89.p !== void 0) {
                                                              let data90 = data89.p;
                                                              const _errs191 = errors;
                                                              if (errors === _errs191) {
                                                                if (Array.isArray(data90)) {
                                                                  if (data90.length > 3) {
                                                                    validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/p", schemaPath: "#/properties/poses/items/properties/pose/items/properties/p/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                    return false;
                                                                  } else {
                                                                    if (data90.length < 3) {
                                                                      validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/p", schemaPath: "#/properties/poses/items/properties/pose/items/properties/p/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                      return false;
                                                                    } else {
                                                                      var valid48 = true;
                                                                      const len24 = data90.length;
                                                                      for (let i24 = 0; i24 < len24; i24++) {
                                                                        const _errs193 = errors;
                                                                        if (!(typeof data90[i24] == "number")) {
                                                                          validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/p/" + i24, schemaPath: "#/properties/poses/items/properties/pose/items/properties/p/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                          return false;
                                                                        }
                                                                        var valid48 = _errs193 === errors;
                                                                        if (!valid48) {
                                                                          break;
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                } else {
                                                                  validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/p", schemaPath: "#/properties/poses/items/properties/pose/items/properties/p/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                  return false;
                                                                }
                                                              }
                                                              var valid47 = _errs191 === errors;
                                                            } else {
                                                              var valid47 = true;
                                                            }
                                                            if (valid47) {
                                                              if (data89.q !== void 0) {
                                                                let data92 = data89.q;
                                                                const _errs195 = errors;
                                                                if (errors === _errs195) {
                                                                  if (Array.isArray(data92)) {
                                                                    if (data92.length > 4) {
                                                                      validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/q", schemaPath: "#/properties/poses/items/properties/pose/items/properties/q/maxItems", keyword: "maxItems", params: { limit: 4 }, message: "must NOT have more than 4 items" }];
                                                                      return false;
                                                                    } else {
                                                                      if (data92.length < 4) {
                                                                        validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/q", schemaPath: "#/properties/poses/items/properties/pose/items/properties/q/minItems", keyword: "minItems", params: { limit: 4 }, message: "must NOT have fewer than 4 items" }];
                                                                        return false;
                                                                      } else {
                                                                        var valid49 = true;
                                                                        const len25 = data92.length;
                                                                        for (let i25 = 0; i25 < len25; i25++) {
                                                                          const _errs197 = errors;
                                                                          if (!(typeof data92[i25] == "number")) {
                                                                            validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/q/" + i25, schemaPath: "#/properties/poses/items/properties/pose/items/properties/q/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                            return false;
                                                                          }
                                                                          var valid49 = _errs197 === errors;
                                                                          if (!valid49) {
                                                                            break;
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  } else {
                                                                    validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/q", schemaPath: "#/properties/poses/items/properties/pose/items/properties/q/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                    return false;
                                                                  }
                                                                }
                                                                var valid47 = _errs195 === errors;
                                                              } else {
                                                                var valid47 = true;
                                                              }
                                                              if (valid47) {
                                                                if (data89.s !== void 0) {
                                                                  let data94 = data89.s;
                                                                  const _errs199 = errors;
                                                                  if (errors === _errs199) {
                                                                    if (Array.isArray(data94)) {
                                                                      if (data94.length > 3) {
                                                                        validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/s", schemaPath: "#/properties/poses/items/properties/pose/items/properties/s/maxItems", keyword: "maxItems", params: { limit: 3 }, message: "must NOT have more than 3 items" }];
                                                                        return false;
                                                                      } else {
                                                                        if (data94.length < 3) {
                                                                          validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/s", schemaPath: "#/properties/poses/items/properties/pose/items/properties/s/minItems", keyword: "minItems", params: { limit: 3 }, message: "must NOT have fewer than 3 items" }];
                                                                          return false;
                                                                        } else {
                                                                          var valid50 = true;
                                                                          const len26 = data94.length;
                                                                          for (let i26 = 0; i26 < len26; i26++) {
                                                                            const _errs201 = errors;
                                                                            if (!(typeof data94[i26] == "number")) {
                                                                              validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/s/" + i26, schemaPath: "#/properties/poses/items/properties/pose/items/properties/s/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                              return false;
                                                                            }
                                                                            var valid50 = _errs201 === errors;
                                                                            if (!valid50) {
                                                                              break;
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    } else {
                                                                      validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/s", schemaPath: "#/properties/poses/items/properties/pose/items/properties/s/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                      return false;
                                                                    }
                                                                  }
                                                                  var valid47 = _errs199 === errors;
                                                                } else {
                                                                  var valid47 = true;
                                                                }
                                                                if (valid47) {
                                                                  if (data89.m !== void 0) {
                                                                    let data96 = data89.m;
                                                                    const _errs203 = errors;
                                                                    if (errors === _errs203) {
                                                                      if (Array.isArray(data96)) {
                                                                        var valid51 = true;
                                                                        const len27 = data96.length;
                                                                        for (let i27 = 0; i27 < len27; i27++) {
                                                                          const _errs205 = errors;
                                                                          if (!(typeof data96[i27] == "number")) {
                                                                            validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/m/" + i27, schemaPath: "#/properties/poses/items/properties/pose/items/properties/m/items/type", keyword: "type", params: { type: "number" }, message: "must be number" }];
                                                                            return false;
                                                                          }
                                                                          var valid51 = _errs205 === errors;
                                                                          if (!valid51) {
                                                                            break;
                                                                          }
                                                                        }
                                                                      } else {
                                                                        validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23 + "/m", schemaPath: "#/properties/poses/items/properties/pose/items/properties/m/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                                        return false;
                                                                      }
                                                                    }
                                                                    var valid47 = _errs203 === errors;
                                                                  } else {
                                                                    var valid47 = true;
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        } else {
                                                          validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose/" + i23, schemaPath: "#/properties/poses/items/properties/pose/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                                          return false;
                                                        }
                                                      }
                                                      var valid46 = _errs189 === errors;
                                                      if (!valid46) {
                                                        break;
                                                      }
                                                    }
                                                  }
                                                } else {
                                                  validate10.errors = [{ instancePath: instancePath + "/poses/" + i22 + "/pose", schemaPath: "#/properties/poses/items/properties/pose/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                                                  return false;
                                                }
                                              }
                                              var valid45 = _errs187 === errors;
                                            } else {
                                              var valid45 = true;
                                            }
                                          }
                                        }
                                      }
                                    }
                                  } else {
                                    validate10.errors = [{ instancePath: instancePath + "/poses/" + i22, schemaPath: "#/properties/poses/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                                    return false;
                                  }
                                }
                                var valid44 = _errs180 === errors;
                                if (!valid44) {
                                  break;
                                }
                              }
                            }
                          } else {
                            validate10.errors = [{ instancePath: instancePath + "/poses", schemaPath: "#/properties/poses/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                            return false;
                          }
                        }
                        var valid0 = _errs178 === errors;
                      } else {
                        var valid0 = true;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate10.errors = [{ instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
      return false;
    }
  }
  validate10.errors = vErrors;
  return errors === 0;
}
export {
  motion_library_validator_default as default,
  validate
};
