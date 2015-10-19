/**
 * This transform converts stuff like:
 *
 *  let x = this.foo.bind(this);
 *
 *  to
 *
 *  let x = ::this.foo;
 *
 */

module.exports = function (file, api) {
  const j = api.jscodeshift;

  return j(file.source)
    .find(j.CallExpression, {callee: {object: {object: j.ThisExpression}}})
    .filter(p => p.value.arguments.length == 1 && p.value.arguments[0].type == "ThisExpression")
    .replaceWith(
      p => j.bindExpression(null, p.value.callee.object)
  )
    .toSource();
};
