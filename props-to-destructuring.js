/**
 * Transforms:
 * class C extends React.Component() {
 *  render() {
 *   return <div foo={this.props.foo} bar={this.props.bar} />
 *  }
 * }
 *** To:
 *
 * class C extends React.Component() {
 *  render() {
 *   const {
 *    foo,
 *    bar
 *   } = this.props;
 *
 *   return <div foo={foo} bar={bar} />
 *  }
 * }
 *
 */

module.exports = function (file, api) {
  const j = api.jscodeshift;

  return j(file.source)
    .find(j.FunctionExpression)
    .replaceWith(p => {
      const root = j(p.value);
      const variablesToReplace = {};
      const definedVariables = {};

      // Figure out which variable identifiers create identifiers within the scope.
      root
        .find(j.Identifier)
        .getVariableDeclarators(p => p.value.name)
        .forEach(p => {
          const id = p.value.id;
          if (id.type === 'Identifier') {
            definedVariables[id.name] = true;
          } else {
            id.properties.forEach(it => {
              definedVariables[it.value.name] = true;
            })
          }
        });

      // Transform "this.props.xyz" to "xyz", and record what we've transformed.
      // Transform as long as we don't have "xyz" already defined in the scope.
      root
        .closestScope()
        .find(j.MemberExpression, {
          object: {
            type: 'MemberExpression',
            object: {type: 'ThisExpression'},
            property: {name: 'props'}
          }
        })
        .filter(p => !definedVariables.hasOwnProperty(p.value.property.name))
        .replaceWith(p => p.value.property)
        .forEach(p => {
          variablesToReplace[p.value.name] = true;
        });

      // Create property definitions for variables that we've replaced.
      const properties = Object.keys(variablesToReplace)
        .map(k => {
          const prop = j.property('init', j.identifier(k), j.identifier(k));
          prop.shorthand = true;
          return prop;
        });

      // Create the variable definition `const { xyz } = this.props;`
      const decl = properties.length ?
        j.variableDeclaration('const',
          [j.variableDeclarator(
            j.objectPattern(properties),
            j.memberExpression(j.thisExpression(), j.identifier('props')))
          ]) : null;

      // Add the variable definition to the top of the function expression body.
      return j.functionExpression(
        p.value.id,
        p.value.params,
        j.blockStatement(decl ? [decl].concat(p.value.body.body) : p.value.body.body)
      );
    }
  ).toSource();
};
