const inputJsonElement = document.getElementById("inputJson");
const outputJsonElement = document.getElementById("outputJson");
const outputBlockElement = document.getElementById("outputBlock");
const floatingAlertElement = document.getElementById("floatingAlert");
const alertMessageElement = document.getElementById("alertMessage");
const closeAlertButton = document.getElementById("closeAlert");
const copyButton = document.getElementById("copyButton");
const copyIcon = document.getElementById("copyIcon");
const copyText = document.getElementById("copyText");
const inputNameElement = document.getElementById("inputName");
const inputLocalUrlElement = document.getElementById("inputLocalUrl");
const inputRemoteUrlElement = document.getElementById("inputRemoteUrl");
const inputPrivateKeyElement = document.getElementById("inputPrivateKey");
const checkLocalUrlElement = document.getElementById("enableLocalUrl");
const checkRemoteUrlElement = document.getElementById("enableRemoteUrl");
const prefixSelectElement = document.getElementById("prefixSelect");
const groupNameSelectElement = document.getElementById("groupNameSelect");
const permissionOutputElement = document.getElementById("permissionOutput");

function convertJson() {
  if (!checkLocalUrlElement.checked && !checkRemoteUrlElement.checked) {
    showFloatingAlert("Please choose at least one URL option.");
    return;
  }
  const inputJson = inputJsonElement.value;
  try {
    const parsedJson = JSON.parse(inputJson);
    const convertedJson = transformJson(parsedJson);
    outputJsonElement.textContent = JSON.stringify(convertedJson, null, 2);
    hljs.highlightElement(outputJsonElement);
    outputBlockElement.style.display = "block";
    const permissions = generatePermissions(parsedJson);
    populateGroupNames(permissions);
    localStorage.setItem("checkLocalUrl", checkLocalUrlElement.checked);
    localStorage.setItem("checkRemoteUrl", checkRemoteUrlElement.checked);
    localStorage.setItem("collectionName", inputNameElement.value);
    localStorage.setItem("localUrl", inputLocalUrlElement.value);
    localStorage.setItem("remoteUrl", inputRemoteUrlElement.value);
    localStorage.setItem("privateKey", inputPrivateKeyElement.value);
  } catch (error) {
    showFloatingAlert(error.message);
  }
}

function generatePermissions(json) {
  const permissions = [];
  for (const [path, methods] of Object.entries(json.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const controllerName = operation.tags[0].replace("-controller", "");
      const permission = generatePermissionsBodyJson(controllerName, path, 2);
      permissions.push(permission);
    }
  }
  return permissions;
}

function populateGroupNames(permissions) {
  const groupNames = [...new Set(permissions.map((p) => p.nameGroup))];
  groupNameSelectElement.innerHTML = groupNames
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("");
  updatePermissionOutput();
}

function updatePermissionOutput() {
  const selectedGroupName = groupNameSelectElement.value;
  const prefix = parseInt(prefixSelectElement.value);
  const parsedJson = JSON.parse(inputJsonElement.value);
  const permissions = generatePermissions(parsedJson)
    .filter((p) => p.nameGroup === selectedGroupName)
    .map((p) => {
      const permissionCode = generatePermissionCode(
        p.nameGroup.toLowerCase().replace(/\s+/g, "-"),
        p.action,
        prefix
      );
      return `${p.action},${p.name},${p.description},${p.nameGroup},${permissionCode}`;
    });

  permissionOutputElement.value =
    "action,name,description,nameGroup,permissionCode\n" +
    permissions.join("\n");
}

function showFloatingAlert(message) {
  alertMessageElement.textContent = message;
  floatingAlertElement.style.display = "block";
  setTimeout(() => {
    floatingAlertElement.style.display = "none";
  }, 5000);
}

closeAlertButton.onclick = () => {
  floatingAlertElement.style.display = "none";
};

function copyOutput() {
  const outputText = outputJsonElement.textContent;
  navigator.clipboard
    .writeText(outputText)
    .then(() => {
      updateCopyButton(true);
      setTimeout(() => updateCopyButton(false), 1500);
    })
    .catch(console.error);
}

function updateCopyButton(copied) {
  copyButton.classList.toggle("btn-secondary", !copied);
  copyButton.classList.toggle("btn-success", copied);
  copyIcon.classList.toggle("fa-copy", !copied);
  copyIcon.classList.toggle("fa-check", copied);
  copyText.textContent = copied ? "Copied" : "Copy";
}

function transformJson(json) {
  const output = createBaseStructure();
  const localItem = output.item[0];
  const remoteItem = output.item[1];
  addControllerItems(json, localItem, "localUrl");
  addControllerItems(json, remoteItem, "remoteUrl");
  if (!checkLocalUrlElement.checked) {
    output.item.splice(0, 1);
  }
  if (!checkRemoteUrlElement.checked) {
    output.item.splice(1, 1);
  }
  return output;
}

function addControllerItems(json, baseItem, urlKey) {
  addAdditionalRequestItem(baseItem, urlKey);
  const controllerItems = {};
  for (const [path, methods] of Object.entries(json.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const controllerName = operation.tags[0].replace("-controller", "");
      if (!controllerItems[controllerName]) {
        controllerItems[controllerName] = { name: controllerName, item: [] };
        baseItem.item.push(controllerItems[controllerName]);
      }
      const request = createRequest(
        json,
        method,
        path.replace("{id}", "0"),
        operation,
        urlKey
      );
      const item = {
        name: operation.summary,
        request,
      };
      if (operation.summary === "list") {
        item.event = [
          {
            listen: "test",
            script: {
              exec: [
                "const response = pm.response.json();",
                "if (response.data.content) {",
                "  const ids = response.data.content.map(item => item.id);",
                "  pm.variables.set('ids', ids);",
                "} else {",
                "  pm.variables.set('ids', []);",
                "}",
              ],
              type: "text/javascript",
            },
          },
        ];
      }
      if (method.toUpperCase != "GET") {
        item.event = [
          {
            listen: "prerequest",
            script: {
              exec: [
                "const ids = pm.variables.get('ids');",
                "pm.variables.set('id', ids.shift());",
                "if (Array.isArray(ids) && ids.length > 0) {",
                `    pm.execution.setNextRequest('${operation.summary}');`,
                "} else {",
                "    pm.execution.setNextRequest(null);",
                "}",
              ],
              type: "text/javascript",
              packages: {},
            },
          },
        ];
      }
      controllerItems[controllerName].item.push(item);
    }
  }
}

function getCurrentDate() {
  const now = new Date();
  const formatter = now
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/\//g, "/");
  return formatter.replace(",", "");
}

function createBaseStructure() {
  const collectionName = inputNameElement.value;
  const localUrl = inputLocalUrlElement.value;
  const remoteUrl = inputRemoteUrlElement.value;
  const privateKey = inputPrivateKeyElement.value;
  return {
    info: {
      name: `${collectionName} [${getCurrentDate()}]`,
      description: "API Documentation",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: {
      type: "bearer",
      bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
    },
    event: [
      { listen: "prerequest", script: { type: "text/javascript", exec: [""] } },
      { listen: "test", script: { type: "text/javascript", exec: [""] } },
    ],
    variable: [
      { key: "localUrl", value: `localhost:${localUrl}`, type: "string" },
      { key: "remoteUrl", value: `https://${remoteUrl}`, type: "string" },
      { key: "clientId", value: "abc_client", type: "string" },
      { key: "clientSecret", value: "abc123", type: "string" },
      { key: "accessToken", value: "", type: "string" },
      { key: "privateKey", value: privateKey, type: "string" },
    ],
    item: [
      { name: "local", item: [] },
      { name: "remote", item: [] },
    ],
  };
}

function addAdditionalRequestItem(baseItem, urlKey) {
  baseItem.item.push({
    name: "requestToken",
    event: [
      {
        listen: "test",
        script: {
          exec: [
            'if (pm.response.json().access_token) { pm.collectionVariables.set("accessToken", pm.response.json().access_token); }',
          ],
          type: "text/javascript",
        },
      },
    ],
    request: {
      auth: {
        type: "basic",
        basic: [
          { key: "username", value: "{{clientId}}", type: "string" },
          { key: "password", value: "{{clientSecret}}", type: "string" },
        ],
      },
      method: "POST",
      header: [],
      body: {
        mode: "raw",
        raw: JSON.stringify(
          {
            username: "admin",
            password: "admin123654",
            grant_type: "password",
          },
          null,
          2
        ),
        options: { raw: { language: "json" } },
      },
      url: {
        raw: `{{${urlKey}}}/api/token`,
        host: [`{{${urlKey}}}`],
        path: ["api", "token"],
      },
    },
  });
  baseItem.item.push({
    name: "permission",
    item: [
      {
        name: "create",
        request: {
          method: "POST",
          header: [
            {
              key: "Accept",
              value: "application/json",
            },
            {
              key: "Content-Type",
              value: "application/json",
            },
          ],
          body: {
            mode: "raw",
            raw: '{\n  "action": "{{action}}",\n  "description": "{{description}}",\n  "isSystem": 0,\n  "name": "{{name}}",\n  "nameGroup": "{{group}}",\n  "permissionCode": "{{permissionCode}}",\n  "showMenu": 0\n}',
            options: {
              raw: {
                language: "json",
              },
            },
          },
          url: {
            raw: `{{${urlKey}}}/v1/permission/create`,
            host: [`{{${urlKey}}}`],
            path: ["v1", "permission", "create"],
          },
        },
      },
      {
        name: "list",
        event: [
          {
            listen: "test",
            script: {
              exec: [
                "const response = pm.response.json();",
                "if (response.data) {",
                "  const ids = response.data.map(item => item.id);",
                "  pm.variables.set('ids', ids);",
                "} else {",
                "  pm.variables.set('ids', []);",
                "}",
              ],
              type: "text/javascript",
              packages: {},
            },
          },
        ],
        request: {
          method: "GET",
          header: [
            {
              key: "Accept",
              value: "application/json",
            },
          ],
          url: {
            raw: `{{${urlKey}}}/v1/permission/list`,
            host: [`{{${urlKey}}}`],
            path: ["v1", "permission", "list"],
          },
        },
      },
    ],
  });
}

function createRequest(json, method, path, operation, urlKey) {
  const request = {
    method: method.toUpperCase(),
    header: [{ key: "Accept", value: "application/json" }],
    url: {
      raw: `{{${urlKey}}}${path}`,
      host: [`{{${urlKey}}}`],
      path: path.split("/").filter(Boolean),
    },
  };
  if (operation.parameters) {
    addQueryParams(request, operation.parameters);
    addBodyParams(json, request, operation.parameters);
  }
  return request;
}

function addQueryParams(request, parameters) {
  const excludedNames = ["offset", "paged", "sort.unsorted", "unpaged"];
  const queryParams = parameters.filter(
    (p) => p.in === "query" && !excludedNames.includes(p.name)
  );
  if (queryParams.length > 0) {
    request.url.query = queryParams.map((p) => ({
      key:
        p.name === "pageNumber"
          ? "page"
          : p.name === "pageSize"
          ? "size"
          : p.name === "sort.sorted"
          ? "sort"
          : p.name,
      value:
        p.name === "sort.sorted"
          ? "createdDate,desc"
          : p.name === "pageSize"
          ? "20"
          : p.type === "integer"
          ? "0"
          : p.format === "date-time"
          ? getCurrentDate()
          : `${p.type}`,
      disabled: true,
    }));
  }
}

function addBodyParams(json, request, parameters) {
  const bodyParam = parameters.find((p) => p.in === "body");
  if (bodyParam) {
    request.header.push({ key: "Content-Type", value: "application/json" });
    const schemaName = bodyParam.schema.$ref.split("/").pop();
    request.body = {
      mode: "raw",
      raw: JSON.stringify(
        generateRequestBody(json.definitions[schemaName].properties),
        null,
        2
      ),
      options: { raw: { language: "json" } },
    };
  }
  const formDataParams = parameters.filter((p) => p.in === "formData");
  if (formDataParams.length > 0) {
    request.header.push({ key: "Content-Type", value: "multipart/form-data" });
    request.body = {
      mode: "formdata",
      formdata: formDataParams.map((param) => ({
        key: param.name,
        type: (param.schema?.type ?? param.type) === "file" ? "file" : "text",
      })),
      options: { raw: { language: "json" } },
    };
  }
}

function generateRequestBody(properties) {
  return Object.entries(properties).reduce((acc, [key, value]) => {
    acc[key] =
      key === "permissions"
        ? "{{ids}}"
        : key === "privateKey"
        ? "{{privateKey}}"
        : value.format === "date-time"
        ? getCurrentDate()
        : value.type === "integer" || value.type === "number"
        ? 0
        : value.type === "array"
        ? []
        : `${value.type}`;
    return acc;
  }, {});
}

document.addEventListener("DOMContentLoaded", () => {
  hljs.highlightAll();
});
checkLocalUrlElement.checked = localStorage.getItem("checkLocalUrl") === "true";
checkRemoteUrlElement.checked =
  localStorage.getItem("checkRemoteUrl") === "true";
checkRemoteUrlElement.addEventListener("change", function () {
  inputRemoteUrlElement.disabled = !this.checked;
});
checkLocalUrlElement.addEventListener("change", function () {
  inputLocalUrlElement.disabled = !this.checked;
});
copyButton.addEventListener("click", copyOutput);
inputNameElement.value = localStorage.getItem("collectionName");
inputLocalUrlElement.value = localStorage.getItem("localUrl");
inputRemoteUrlElement.value = localStorage.getItem("remoteUrl");
inputPrivateKeyElement.value = localStorage.getItem("privateKey");
inputLocalUrlElement.disabled = !checkLocalUrlElement.checked;
inputRemoteUrlElement.disabled = !checkRemoteUrlElement.checked;
prefixSelectElement.addEventListener("change", updatePermissionOutput);
groupNameSelectElement.addEventListener("change", updatePermissionOutput);
