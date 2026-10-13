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

// motion-catalog-validator.js
var validate = validate14;
var motion_catalog_validator_default = validate14;
var schema13 = { "type": "object", "additionalProperties": false, "required": ["version", "models"], "properties": { "version": { "const": 1 }, "models": { "type": "array", "maxItems": 200, "items": { "type": "object", "additionalProperties": false, "required": ["key", "name"], "properties": { "key": { "type": "string", "pattern": "^[a-f0-9]{64}$" }, "name": { "type": "string", "minLength": 1, "maxLength": 80 }, "builtinId": { "enum": ["quaternius", "mesh2motion", "makehuman"] } } } } } };
var pattern0 = new RegExp("^[a-f0-9]{64}$", "u");
var func2 = require_ucs2length().default;
function validate14(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (errors === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      let missing0;
      if (data.version === void 0 && (missing0 = "version") || data.models === void 0 && (missing0 = "models")) {
        validate14.errors = [{ instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: missing0 }, message: "must have required property '" + missing0 + "'" }];
        return false;
      } else {
        const _errs1 = errors;
        for (const key0 in data) {
          if (!(key0 === "version" || key0 === "models")) {
            validate14.errors = [{ instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" }];
            return false;
            break;
          }
        }
        if (_errs1 === errors) {
          if (data.version !== void 0) {
            const _errs2 = errors;
            if (1 !== data.version) {
              validate14.errors = [{ instancePath: instancePath + "/version", schemaPath: "#/properties/version/const", keyword: "const", params: { allowedValue: 1 }, message: "must be equal to constant" }];
              return false;
            }
            var valid0 = _errs2 === errors;
          } else {
            var valid0 = true;
          }
          if (valid0) {
            if (data.models !== void 0) {
              let data1 = data.models;
              const _errs3 = errors;
              if (errors === _errs3) {
                if (Array.isArray(data1)) {
                  if (data1.length > 200) {
                    validate14.errors = [{ instancePath: instancePath + "/models", schemaPath: "#/properties/models/maxItems", keyword: "maxItems", params: { limit: 200 }, message: "must NOT have more than 200 items" }];
                    return false;
                  } else {
                    var valid1 = true;
                    const len0 = data1.length;
                    for (let i0 = 0; i0 < len0; i0++) {
                      let data2 = data1[i0];
                      const _errs5 = errors;
                      if (errors === _errs5) {
                        if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
                          let missing1;
                          if (data2.key === void 0 && (missing1 = "key") || data2.name === void 0 && (missing1 = "name")) {
                            validate14.errors = [{ instancePath: instancePath + "/models/" + i0, schemaPath: "#/properties/models/items/required", keyword: "required", params: { missingProperty: missing1 }, message: "must have required property '" + missing1 + "'" }];
                            return false;
                          } else {
                            const _errs7 = errors;
                            for (const key1 in data2) {
                              if (!(key1 === "key" || key1 === "name" || key1 === "builtinId")) {
                                validate14.errors = [{ instancePath: instancePath + "/models/" + i0, schemaPath: "#/properties/models/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" }];
                                return false;
                                break;
                              }
                            }
                            if (_errs7 === errors) {
                              if (data2.key !== void 0) {
                                let data3 = data2.key;
                                const _errs8 = errors;
                                if (errors === _errs8) {
                                  if (typeof data3 === "string") {
                                    if (!pattern0.test(data3)) {
                                      validate14.errors = [{ instancePath: instancePath + "/models/" + i0 + "/key", schemaPath: "#/properties/models/items/properties/key/pattern", keyword: "pattern", params: { pattern: "^[a-f0-9]{64}$" }, message: 'must match pattern "^[a-f0-9]{64}$"' }];
                                      return false;
                                    }
                                  } else {
                                    validate14.errors = [{ instancePath: instancePath + "/models/" + i0 + "/key", schemaPath: "#/properties/models/items/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                    return false;
                                  }
                                }
                                var valid2 = _errs8 === errors;
                              } else {
                                var valid2 = true;
                              }
                              if (valid2) {
                                if (data2.name !== void 0) {
                                  let data4 = data2.name;
                                  const _errs10 = errors;
                                  if (errors === _errs10) {
                                    if (typeof data4 === "string") {
                                      if (func2(data4) > 80) {
                                        validate14.errors = [{ instancePath: instancePath + "/models/" + i0 + "/name", schemaPath: "#/properties/models/items/properties/name/maxLength", keyword: "maxLength", params: { limit: 80 }, message: "must NOT have more than 80 characters" }];
                                        return false;
                                      } else {
                                        if (func2(data4) < 1) {
                                          validate14.errors = [{ instancePath: instancePath + "/models/" + i0 + "/name", schemaPath: "#/properties/models/items/properties/name/minLength", keyword: "minLength", params: { limit: 1 }, message: "must NOT have fewer than 1 characters" }];
                                          return false;
                                        }
                                      }
                                    } else {
                                      validate14.errors = [{ instancePath: instancePath + "/models/" + i0 + "/name", schemaPath: "#/properties/models/items/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                                      return false;
                                    }
                                  }
                                  var valid2 = _errs10 === errors;
                                } else {
                                  var valid2 = true;
                                }
                                if (valid2) {
                                  if (data2.builtinId !== void 0) {
                                    let data5 = data2.builtinId;
                                    const _errs12 = errors;
                                    if (!(data5 === "quaternius" || data5 === "mesh2motion" || data5 === "makehuman")) {
                                      validate14.errors = [{ instancePath: instancePath + "/models/" + i0 + "/builtinId", schemaPath: "#/properties/models/items/properties/builtinId/enum", keyword: "enum", params: { allowedValues: schema13.properties.models.items.properties.builtinId.enum }, message: "must be equal to one of the allowed values" }];
                                      return false;
                                    }
                                    var valid2 = _errs12 === errors;
                                  } else {
                                    var valid2 = true;
                                  }
                                }
                              }
                            }
                          }
                        } else {
                          validate14.errors = [{ instancePath: instancePath + "/models/" + i0, schemaPath: "#/properties/models/items/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
                          return false;
                        }
                      }
                      var valid1 = _errs5 === errors;
                      if (!valid1) {
                        break;
                      }
                    }
                  }
                } else {
                  validate14.errors = [{ instancePath: instancePath + "/models", schemaPath: "#/properties/models/type", keyword: "type", params: { type: "array" }, message: "must be array" }];
                  return false;
                }
              }
              var valid0 = _errs3 === errors;
            } else {
              var valid0 = true;
            }
          }
        }
      }
    } else {
      validate14.errors = [{ instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
      return false;
    }
  }
  validate14.errors = vErrors;
  return errors === 0;
}
export {
  motion_catalog_validator_default as default,
  validate
};
