import { SOURCE } from "../actions"
import { getRootNode } from "src/plugins/validate-semantic/helpers"
const operationKeys = ["get", "post", "put", "delete", "options", "head", "patch", "trace"]

export const validateParameterFormDataCaseTypo = () => system => {
  return system.validateSelectors
    .allParameters()
    .then(nodes => {
      return nodes.reduce((acc, node) => {
        const value = node.node

        if(
          value.in &&
          typeof value.in === "string" &&
          value.in.toLowerCase() === "formdata" &&
          value.in !== "formData"
        ) {
          acc.push({
            message: `Parameter "in: ${value.in}" is invalid, did you mean "in: formData"?`,
            path: [...node.path],
            level: "error",
            source: SOURCE
          })
        }
        return acc
      }, [])
    })
}

export const validateParameterFormDataForFileTypes = () => system => {
  return system.validateSelectors
    .allParameters()
    .then(nodes => {
      return nodes.reduce((acc, node) => {
        const value = node.node

        if(value.type === "file" && value.in !== "formData") {
          acc.push({
            message: `Parameters with "type: file" must have "in: formData"`,
            path: [...node.path],
            level: "error",
            source: SOURCE
          })
        }
        return acc
      }, [])
    })
}

export const validateParameterFormDataConsumesType = () => system => {
  return system.validateSelectors
    .allPathItems()
    .then(nodes => {
      return nodes.reduce((acc, node) => {
        const value = node.node
        const globalConsumes = getRootNode(node).node.consumes ||[] 
        var pathItemParameters = value.parameters

        const hasPathItemFormDataParameter = pathItemParameters != null && pathItemParameters.find(parameter => parameter.in === "formData")
        const hasPathItemFileParameter = pathItemParameters != null && pathItemParameters.find(parameter => parameter.type === "file")

        for (var method of operationKeys) {
          if (value[method] != null) {
            const operationParameters = value[method].parameters 
            if(hasPathItemFileParameter || operationParameters != null && operationParameters.find(parameter => parameter.type === "file")){
              if ((value[method].consumes != null && value[method].consumes != "multipart/form-data") || 
                  (value[method].consumes == null && globalConsumes != "multipart/form-data")) {
                acc.push({
                  message: `Operations with parameters of "type: file" must include "multipart/form-data" in their "consumes" property`,
                  path: [...node.path, method],
                  level: "error",
                  source: SOURCE
                })
              }
            } else if (hasPathItemFormDataParameter || (operationParameters != null && operationParameters.find(parameter => parameter.in === "formData"))) {
              if ((value[method].consumes != null && value[method].consumes != "multipart/form-data" && value[method].consumes != "application/x-www-form-urlencoded") || 
                  (value[method].consumes == null && globalConsumes != "multipart/form-data" && value[method].consumes != "application/x-www-form-urlencoded")) {
                acc.push({
                  message: `Operations with Parameters of "in: formData" must include "application/x-www-form-urlencoded" or "multipart/form-data" in their "consumes" property`,
                  path: [...node.path, method],
                  level: "error",
                  source: SOURCE
                })
              } 
            }
          } 
        }

        return acc
      }, [])
    })
}

export const validateParameterArraysDontContainBodyAndFormData = () => system => {
  return system.validateSelectors
    .allParameterArrays()
    .then(paramArrays => {
      return paramArrays.reduce((acc, node) => {
        const bodyParams = node.node.filter(param => param.in === "body")
        const formDataParams = node.node.filter(param => param.in === "formData")

        if(bodyParams.length && formDataParams.length) {
          acc.push({
            message: `Parameters cannot have both a "in: body" and "in: formData", as "formData" _will_ be the body`,
            path: [...node.path],
            level: "error",
            source: SOURCE
          })
        }
        return acc
      }, [])
    })
}
