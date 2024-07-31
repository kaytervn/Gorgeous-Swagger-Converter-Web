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
    alert("Invalid JSON input: " + error.message);
  }
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

function createBaseStructure() {
  return {
    info: {
      name: "API Documentation",
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
      { key: "localUrl", value: "localhost:7979" },
      {
        key: "remoteUrl",
        value: "https://fm-api.developteam.net",
        type: "string",
      },
      { key: "privateKey", value: "", type: "string" },
      { key: "accessToken", value: "", type: "string" },
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
          { key: "username", value: "abc_client", type: "string" },
          { key: "password", value: "abc123", type: "string" },
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
    request.body = {
      mode: "raw",
      raw: JSON.stringify(
        generateRequestBody(
          json.definitions[bodyParam.schema.$ref.split("/").pop()].properties
        ),
        null,
        2
      ),
      options: { raw: { language: "json" } },
    };
  }
}

function generateRequestBody(properties) {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [key, `<${value.type}>`])
  );
}
