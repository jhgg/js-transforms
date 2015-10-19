/** Converts
 * onClick(function(a, b) {
 *   return a + b;
 * }.bind(this),
 * function(b, c) {
 *   return 1;
 * }.bind(this));
 *
 * onClick(function(a) {
 *   var a = 1;
 *   return a;
 * }.bind(this));
 *
 * var a = function(c) { return c; }.bind(this);
 *
 ** to
 * onClick((a, b) => a + b,
 * (b, c) => 1);
 *
 * onClick(a => {
 *   var a = 1;
 *   return a;
 * });
 *
 * var a = c => c;
 *
 */

module.exports = function(file, api) {
  const j = api.jscodeshift;

  return j(file.source)
  	.find(j.CallExpression, {callee: {property: {name: 'bind'}}})
    .filter(p => p.value.arguments.length == 1 && p.value.arguments[0].type == "ThisExpression")
  	.replaceWith(p => {
    	var body = p.value.callee.object.body;
    	var useExpression = body.type == 'BlockStatement' && body.body.length == 1 && body.body[0].type == "ReturnStatement";
        body = useExpression ? body.body[0].argument : body;
    	return j.arrowFunctionExpression(p.value.callee.object.params, body, useExpression);
    })
    .toSource();
};
