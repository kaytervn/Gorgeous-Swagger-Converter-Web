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
    description: generatePermissionName(controllerItemName, path),
    name: generatePermissionName(controllerItemName, path),
    nameGroup: groupName,
    permissionCode: permissionCode,
  };
}
