function generatePermissions(json) {
  const permissions = [];
  for (const [path, methods] of Object.entries(json.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const controllerName = operation.tags[0].replace("-controller", "");
      const permission = generatePermissionsBodyJson(controllerName, path, 2);
      const excludedNames = ["autoComplete"];
      if (!excludedNames.includes(operation.summary)) {
        permissions.push(permission);
      }
    }
  }
  return permissions;
}

function generatePermissionsBodyJson(controllerItemName, path, prefix) {
  const groupName = controllerItemName
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const permissionCode = generatePermissionCode(
    controllerItemName,
    path,
    prefix
  );

  return {
    action: path.replace("/{id}", ""),
    name: generatePermissionName(controllerItemName, path),
    nameGroup: groupName,
    permissionCode: permissionCode,
  };
}

function generatePermissionCode(controllerItemName, path, prefix) {
  const str =
    controllerItemName +
    "-" +
    path.replace("/{id}", "").split("/").at(-1).replace("get", "view");
  const words = str.split("-");
  const formatted = words.map((word, index) => {
    if (index === 0) {
      return word.substring(0, prefix).toUpperCase();
    } else {
      return word.charAt(0).toUpperCase();
    }
  });
  return formatted.join("_");
}

function generatePermissionName(controllerItemName, path) {
  const str =
    path.replace("/{id}", "").split("/").at(-1).replace("list", "get-list") +
    "-" +
    controllerItemName;
  let name = str.replace(/-/g, " ");
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return name;
}

function updatePermissionOutput(json) {
  const selectedGroupName = groupNameSelectElement.value;
  const prefix = parseInt(prefixSelectElement.value);
  const permissions = generatePermissions(json)
    .filter((p) => p.nameGroup === selectedGroupName)
    .map((p) => {
      const permissionCode = generatePermissionCode(
        p.nameGroup.toLowerCase().replace(/\s+/g, "-"),
        p.action,
        prefix
      );
      return `${p.action},${p.name},${p.nameGroup},${permissionCode}`;
    });
  permissionOutputElement.value =
    "action,name,group,permissionCode\n" + permissions.join("\n");
  hljs.highlightElement(permissionOutputElement);
}
