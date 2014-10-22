from os import listdir
from os.path import isdir

from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

capabilities = [
    DesiredCapabilities.FIREFOX,
    DesiredCapabilities.IE,
    DesiredCapabilities.CHROME,
    DesiredCapabilities.OPERA,
    DesiredCapabilities.SAFARI,
]

test_folders = [dirname for dirname in listdir('test/unit/') if isdir(dirname))

for capability in capabilities:
    driver = webdriver.Remote(
        command_executor='http://vmsel-hub.selenium.bk.sapo.pt:4444/wd/hub',
        desired_capabilities=capablitiy)

    for folder in test_folders:
        driver.visit('http://fsantos.sl.pt:4650/'
            'test/unit/{folder}/'
            '?selenium'.format(folder=folder))

