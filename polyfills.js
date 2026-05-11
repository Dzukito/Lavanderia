(function () {
  if (!Array.from) {
    Array.from = function (value, mapper) {
      var result = [];
      var length = value && typeof value.length === "number" ? value.length : 0;
      for (var index = 0; index < length; index += 1) {
        result.push(mapper ? mapper(value[index], index) : value[index]);
      }
      return result;
    };
  }

  if (!Array.prototype.includes) {
    Array.prototype.includes = function (search) {
      return this.indexOf(search) !== -1;
    };
  }

  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
      for (var index = 0; index < this.length; index += 1) {
        if (predicate(this[index], index, this)) return this[index];
      }
      return undefined;
    };
  }

  if (!String.prototype.padStart) {
    String.prototype.padStart = function (targetLength, padString) {
      var value = String(this);
      var target = Number(targetLength) || 0;
      var pad = padString === undefined ? " " : String(padString);
      while (value.length < target) value = pad + value;
      return value.slice(value.length - target);
    };
  }

  if (!String.prototype.normalize) {
    String.prototype.normalize = function () { return String(this); };
  }

  if (!Object.assign) {
    Object.assign = function (target) {
      if (target == null) throw new TypeError("Cannot convert undefined or null to object");
      var output = Object(target);
      for (var index = 1; index < arguments.length; index += 1) {
        var source = arguments[index];
        if (source == null) continue;
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) output[key] = source[key];
        }
      }
      return output;
    };
  }

  if (!Object.entries) {
    Object.entries = function (object) {
      var result = [];
      for (var key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) result.push([key, object[key]]);
      }
      return result;
    };
  }

  if (!window.Map) {
    window.Map = function (entries) {
      this._keys = [];
      this._values = [];
      if (entries) {
        for (var index = 0; index < entries.length; index += 1) this.set(entries[index][0], entries[index][1]);
      }
    };
    window.Map.prototype.set = function (key, value) {
      var index = this._keys.indexOf(key);
      if (index === -1) {
        this._keys.push(key);
        this._values.push(value);
      } else {
        this._values[index] = value;
      }
      return this;
    };
    window.Map.prototype.get = function (key) {
      var index = this._keys.indexOf(key);
      return index === -1 ? undefined : this._values[index];
    };
    window.Map.prototype.has = function (key) {
      return this._keys.indexOf(key) !== -1;
    };
    window.Map.prototype.values = function () {
      return this._values.slice();
    };
  }

  if (!window.Set) {
    window.Set = function (values) {
      this._values = [];
      if (values) {
        for (var index = 0; index < values.length; index += 1) this.add(values[index]);
      }
    };
    window.Set.prototype.add = function (value) {
      if (this._values.indexOf(value) === -1) this._values.push(value);
      return this;
    };
    window.Set.prototype.has = function (value) {
      return this._values.indexOf(value) !== -1;
    };
  }

  var elementPrototype = window.Element && window.Element.prototype;
  if (elementPrototype && !elementPrototype.matches) {
    elementPrototype.matches = elementPrototype.msMatchesSelector || elementPrototype.webkitMatchesSelector || function (selector) {
      var nodes = (this.document || this.ownerDocument).querySelectorAll(selector);
      var index = 0;
      while (nodes[index] && nodes[index] !== this) index += 1;
      return Boolean(nodes[index]);
    };
  }

  if (elementPrototype && !elementPrototype.closest) {
    elementPrototype.closest = function (selector) {
      var current = this;
      while (current && current.nodeType === 1) {
        if (current.matches(selector)) return current;
        current = current.parentElement || current.parentNode;
      }
      return null;
    };
  }

  if (window.NodeList && !window.NodeList.prototype.forEach) {
    window.NodeList.prototype.forEach = Array.prototype.forEach;
  }

  if (elementPrototype && !("dataset" in elementPrototype) && Object.defineProperty) {
    Object.defineProperty(elementPrototype, "dataset", {
      get: function () {
        var dataset = {};
        for (var index = 0; index < this.attributes.length; index += 1) {
          var attribute = this.attributes[index];
          if (attribute.name.indexOf("data-") !== 0) continue;
          var key = attribute.name.slice(5).replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
          dataset[key] = attribute.value;
        }
        return dataset;
      }
    });
  }

  if (window.DOMTokenList && window.DOMTokenList.prototype) {
    var originalToggle = window.DOMTokenList.prototype.toggle;
    try {
      var test = document.createElement("div");
      test.classList.toggle("x", false);
      if (test.className === "x") {
        window.DOMTokenList.prototype.toggle = function (token, force) {
          if (arguments.length > 1) {
            if (force) {
              this.add(token);
              return true;
            }
            this.remove(token);
            return false;
          }
          return originalToggle.call(this, token);
        };
      }
    } catch (error) {}
  }

  if (!window.Intl) {
    window.Intl = {
      NumberFormat: function () {
        return { format: function (value) { return "$ " + Math.round(Number(value || 0)); } };
      }
    };
  }
}());
