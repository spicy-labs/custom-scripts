// Function to load PapaParse dynamically for CSV parsing
function loadPapaParse(callback) {
    const papaParseScript = document.createElement("script");
    papaParseScript.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js";
    papaParseScript.onload = callback;
    document.body.appendChild(papaParseScript);
  }
   
  // Function to handle file selection and parsing
  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
   
    const fileType = file.type;
    if (fileType === "application/json") {
      const reader = new FileReader();
      reader.onload = function (e) {
        const variables = JSON.parse(e.target.result);
        processPdf(variables);
      };
      reader.readAsText(file);
    } else if (fileType === "text/csv") {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function (results) {
          const variables = results.data;
          //debug
          console.log(JSON.stringify(variables));
          processPdf(variables);
        },
      });
    } else {
      alert("Unsupported file type. Please upload a CSV or JSON file.");
    }
  }
   
  // Function to dynamically add the file input element and set up the event listener
  function setupFileInput() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "fileInput";
    fileInput.accept = ".csv, application/json"; // Accept CSV and JSON
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
    fileInput.addEventListener("change", handleFileSelect);
    fileInput.click();
  }
   
  // Main function to start the process
  function startProcess() {
    loadPapaParse(setupFileInput);
  }
   
  // Call this function from the console to start the process
  startProcess();
   
  async function processPdf(variables) {
    const token = (await SDK.configuration.getValue("GRAFX_AUTH_TOKEN"))
      .parsedData;
    const baseUrl = (await SDK.configuration.getValue("ENVIRONMENT_API"))
      .parsedData + '/';
   
    const grafxApi = {
      getOutputSettings: () => `${baseUrl}output/settings`,
      getTemplates: () =>
        `${baseUrl}templates?limit=100&sortBy=name&sortOrder=None`,
      getTemplateJson: (id) => `${baseUrl}templates/${id}/download`,
      postPdf: () => `${baseUrl}output/pdf`,
      getTaskStatus: (id) => `${baseUrl}output/tasks/${id}`,
      getTaskDownload: (id) => `${baseUrl}output/tasks/${id}/download`,
    };
   
    const defaultHeaders = {
      Accept: "application/json",
      Authorization: `Bearer ${token} `,
    };
   
    async function fetchJson(url, options) {
      const resp = await fetch(url, options);
      return resp.json();
    }
   
    // const outputResponse = await fetchJson(grafxApi.getOutputSettings(), {
    //   headers: defaultHeaders,
    // });
   
    // const outputId = outputResponse.data.find((item) => item.name === "PDF").id;
   
    const templateJson = (await SDK.document.getCurrentState()).parsedData;
   
    const body = JSON.stringify({
      outputSettings: {
        "description": "",
        "default": true,
        "watermark": false,
        "watermarkText": "SAMPLE",
        "outputType": "batch",
        "type": "PDF",
        "name": "PDF"
      },
        //   outputSettingsId: outputId,
      layoutsToExport: ["0"],
      variables: variables,
      documentContent: templateJson,
    });
   
    const pdfOutput = await fetchJson(grafxApi.postPdf(), {
      headers: { ...defaultHeaders, "content-type": "application/json" },
      body: body,
      method: "POST",
    });
   
    const taskId = pdfOutput.data.taskId;
   
    let taskStatus = await fetch(
      grafxApi.getTaskStatus(taskId),
      {
        headers: defaultHeaders,
      },
      false,
    );
   
    while (taskStatus.status == 202) {
      taskStatus = await fetch(
        grafxApi.getTaskStatus(taskId),
        {
          headers: defaultHeaders,
        },
        false,
      );
   
      await new Promise((res) => setTimeout(res, 400));
    }
   
    console.log(await taskStatus.json());
    if (!taskStatus.ok) {
      alert("Task Failed - see console");
    }
    else {
      const download = await fetch(grafxApi.getTaskDownload(taskId), {
        headers: defaultHeaders,
      });
   
      downloadFile(download);
    }
  }
   
  async function downloadFile(response) {
    try {
      const blob = await response.blob();
      const urlObject = URL.createObjectURL(blob);
   
      const link = document.createElement("a");
      link.href = urlObject;
      link.download = "output.pdf";
      document.body.appendChild(link);
      link.click();
   
      // Clean up
      URL.revokeObjectURL(urlObject);
      document.body.removeChild(link);
   
      console.log("File downloaded: output.pdf");
      alert("File downloaded: output.pdf")
    } catch (error) {
      console.error("Error:", error);
      alert("Error see console")
    }
  }
  