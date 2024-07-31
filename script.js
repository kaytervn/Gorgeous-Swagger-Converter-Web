const privateKey =
  "MIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAjoTUdecisi/VZykOGl/TquaNgD0M0OPV4R2YHAUrDA7M5syXP510hLMNO44p8P+aqMzekGLJyEd7SzRETHGoqQIDAQABAkAhe5mCvbPMEyra2q1iiuLqwtG5sB4jsXNdORu0cY5kfXRwHEK/1RIW3m+8vnLa766OOUM848mHnK8wvVrMDW+lAiEAkLFj3MXB0f6tOpZlmT/KwvuR1Hwt7ylvJkTetqnaf68CIQD8J0xQ3LkJQqjadOepXBX5rf+bsTpRMeMkiNPSz8tbJwIgSRSfmKl1fKgCPJ4r0Jxsv9CqVkUmOi6WSiDs0Bu4FVcCIQDzQRYmjEkV3fD3jwBOKkAo9us4T+lqmy39+OIg5cXQ0QIhAIwqv/PvWUp3XvSBLoc0G00r0hGDJLwoiS0FpBTerHx7";
const remoteUrl = "https://fm-api.developteam.net";
const localUrl = "localhost:7979";

function convertJson() {
  const inputJson = document.getElementById("inputJson").value;
  try {
    const parsedJson = JSON.parse(inputJson);
    const convertedJson = transformJson(parsedJson);
    const outputElement = document.getElementById("outputJson");
    outputElement.textContent = JSON.stringify(convertedJson, null, 2);
    hljs.highlightElement(outputElement);
    document.getElementById("outputBlock").style.display = "block";
  } catch (error) {
    showFloatingAlert(error.message);
  }
}

function showFloatingAlert(message) {
  const alertElement = document.getElementById("floatingAlert");
  const messageElement = document.getElementById("alertMessage");
  const closeButton = document.getElementById("closeAlert");
  messageElement.textContent = message;
  alertElement.style.display = "block";
  closeButton.onclick = function () {
    alertElement.style.display = "none";
  };
  setTimeout(() => {
    alertElement.style.display = "none";
  }, 5000);
}

function copyOutput() {
  var outputText = document.getElementById("outputJson").textContent;
  var copyButton = document.getElementById("copyButton");
  var copyIcon = document.getElementById("copyIcon");
  var copyText = document.getElementById("copyText");
  navigator.clipboard
    .writeText(outputText)
    .then(() => {
      copyButton.classList.remove("btn-secondary");
      copyButton.classList.add("btn-success");

      copyIcon.classList.remove("fa-copy");
      copyIcon.classList.add("fa-check");
      copyText.textContent = "Copied";

      setTimeout(() => {
        copyButton.classList.remove("btn-success");
        copyButton.classList.add("btn-secondary");

        copyIcon.classList.remove("fa-check");
        copyIcon.classList.add("fa-copy");
        copyText.textContent = "Copy";
      }, 1500);
    })
    .catch((err) => {
      console.error("Không thể sao chép văn bản: ", err);
    });
}

function transformJson(json) {
  const output = createBaseStructure();
  const localItem = output.item[0];
  const remoteItem = output.item[1];
  addControllerItems(json, localItem, "localUrl");
  addControllerItems(json, remoteItem, "remoteUrl");
  return output;
}

function addControllerItems(json, baseItem, urlKey) {
  addRequestTokenItem(baseItem, urlKey);
  const controllerItems = {};

  for (const [path, methods] of Object.entries(json.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const controllerName = operation.tags[0].replace("-controller", "");
      if (!controllerItems[controllerName]) {
        controllerItems[controllerName] = { name: controllerName, item: [] };
        baseItem.item.push(controllerItems[controllerName]);
      }

      const request = createRequest(json, method, path, operation, urlKey);
      controllerItems[controllerName].item.push({
        name: operation.summary,
        request,
      });
    }
  }
}

function getCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function createBaseStructure() {
  return {
    info: {
      name: `API [${getCurrentDate()}]`,
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
      { key: "localUrl", value: `${localUrl}`, type: "string" },
      {
        key: "remoteUrl",
        value: `${remoteUrl}`,
        type: "string",
      },
      { key: "clientId", value: "abc_client", type: "string" },
      { key: "clientSecret", value: "abc123", type: "string" },
      { key: "accessToken", value: "", type: "string" },
      { key: "privateKey", value: `${privateKey}`, type: "string" },
    ],
    item: [
      { name: "local", item: [] },
      { name: "remote", item: [] },
    ],
  };
}

function addRequestTokenItem(baseItem, urlKey) {
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
  const excludedNames = [
    "offset",
    "paged",
    "sort.sorted",
    "sort.unsorted",
    "unpaged",
  ];
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
          : p.name,
      value: `<${p.type}>`,
    }));
    request.url.raw +=
      "?" + request.url.query.map((p) => `${p.key}=${p.value}`).join("&");
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

    const formdata = formDataParams.map((param) => ({
      key: param.name,
      type: (param.schema?.type ?? param.type) === "file" ? "file" : "text",
    }));
    request.body = {
      mode: "formdata",
      formdata: formdata,
      options: { raw: { language: "json" } },
    };
  }
}

function generateRequestBody(properties) {
  return Object.entries(properties).reduce((acc, [key, value]) => {
    acc[key] = key === "privateKey" ? "{{privateKey}}" : `<${value.type}>`;
    return acc;
  }, {});
}
